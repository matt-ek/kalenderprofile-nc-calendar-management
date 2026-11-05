"""Browser regression for read-before-write CalDAV safety; fake server, never live DAV."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
BUNDLE = (ROOT / "src/calendar-management-generic.js").read_text(encoding="utf-8")
ORIGIN = "https://nc203.example.test"

MOCK = r"""() => {
  const names = ['Zeta', 'Alpha', 'Mitte'];
  const root = document.createElement('div');
  root.className = 'calendar-list-wrapper';
  root.innerHTML = names.map(name =>
    '<li class="draggable-calendar-list-item"><div class="app-navigation-entry">' +
    '<span class="app-navigation-entry__name">' + name + '</span>' +
    '<span class="checkbox-marked-icon"></span></div></li>'
  ).join('');
  document.body.append(root);
  window.OC = {
    getCurrentUser: () => ({uid: 'tester'}),
    generateRemoteUrl: () => location.origin + '/remote.php/dav',
  };
  window.__davCalls = [];
  window.__davOrders = {Zeta: 0, Alpha: 1, Mitte: 2};
  window.__davMode = 'normal';
  window.__davWriteCount = 0;
  const xml = (name, order) =>
    '<d:response><d:href>/remote.php/dav/calendars/tester/' +
    name.toLowerCase() + '/</d:href><d:propstat><d:prop>' +
    '<d:displayname>' + name + '</d:displayname>' +
    '<d:resourcetype><d:collection/></d:resourcetype>' +
    '<a:calendar-order>' + order + '</a:calendar-order>' +
    '</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>';
  const multistatus = (content) =>
    '<?xml version="1.0"?><d:multistatus xmlns:d="DAV:" ' +
    'xmlns:a="http://apple.com/ns/ical/" ' +
    'xmlns:cal="urn:ietf:params:xml:ns:caldav">' + content + '</d:multistatus>';
  window.fetch = async (url, options={}) => {
    const method = options.method || 'GET';
    const address = String(url);
    window.__davCalls.push({method, url: address});
    if (method === 'PROPFIND') {
      if (window.__davMode === 'read-error') throw Error('Simulated network read failure');
      const entries = Object.entries(window.__davOrders)
        .filter(([name]) => window.__davMode !== 'missing' || name !== 'Mitte')
        .map(([name, order]) => xml(name,
          window.__davMode === 'invalid-order' && name === 'Zeta' ? 'invalid' : order));
      return {ok: true, status: 207, text: async () => multistatus(entries.join(''))};
    }
    if (method === 'PROPPATCH') {
      if (!address.startsWith(location.origin + '/remote.php/dav/calendars/tester/'))
        throw Error('Attempted cross-directory write: ' + address);
      const match = /\/(zeta|alpha|mitte)\/$/.exec(address);
      if (!match) throw Error('Unknown DAV destination: ' + address);
      const body = String(options.body || '');
      const value = /<a:calendar-order>(\d+)<\/a:calendar-order>/.exec(body);
      if (!value) throw Error('Missing valid order payload');
      const name = {zeta: 'Zeta', alpha: 'Alpha', mitte: 'Mitte'}[match[1]];
      window.__davOrders[name] = Number(value[1]);
      window.__davWriteCount++;
      if ((window.__davMode === 'fail-after-write' && window.__davWriteCount === 1) ||
          (window.__davMode === 'rollback-fails' && window.__davWriteCount <= 2)) {
        return {ok: false, status: 500, text: async () => 'DAV failed after server mutation'};
      }
      return {ok: true, status: 207, text: async () =>
        multistatus('<d:response><d:propstat><d:prop><a:calendar-order/>' +
        '</d:prop><d:status>HTTP/1.1 200 OK</d:status></d:propstat></d:response>')};
    }
    throw Error('Unexpected network request: ' + method);
  };
}"""


def setup_case(browser, accept_confirmation, mode="normal"):
    context = browser.new_context(viewport={"width": 1390, "height": 1000})
    page = context.new_page()
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    page.on("dialog", lambda d: d.accept() if accept_confirmation else d.dismiss())
    page.route(ORIGIN + "/**", lambda route: route.fulfill(status=200, body="<html><body></body></html>"))
    page.goto(ORIGIN + "/apps/calendar")
    page.evaluate(MOCK)
    page.evaluate("(mode) => { window.__davMode = mode; }", mode)
    page.evaluate(BUNDLE)
    app = page.frame_locator("#nc-calendar-management-generic-v2").locator("#kalenderprofile-app")
    expect(app.locator("#close")).to_be_visible()
    # Startup may only inspect the DOM. No remote calendar mutation is allowed.
    assert page.evaluate("window.__davCalls.filter(x => x.method === 'PROPPATCH').length") == 0
    app.locator('[data-tab="sorting"]').click()
    app.locator("#sort-mode").select_option("alphabet")
    return context, page, app, errors


def check_no_write(browser, mode):
    context, page, app, errors = setup_case(browser, True, mode)
    try:
        expect(app.locator("#sort-apply")).to_be_disabled()
        app.locator("#sort-check").click()
        if mode == "normal":
            expect(app.locator("#sort-apply")).to_be_enabled()
        else:
            expect(app.locator("#sort-apply")).to_be_disabled()
            assert "nicht erfolgreich" in app.locator("#status").inner_text()
        assert page.evaluate("window.__davCalls.some(x => x.method === 'PROPFIND')")
        assert not page.evaluate("window.__davCalls.some(x => x.method === 'PROPPATCH')")
        assert errors == [], errors
    finally:
        context.close()


def denied_confirmation(browser):
    context, page, app, errors = setup_case(browser, False)
    try:
        app.locator("#sort-check").click()
        expect(app.locator("#sort-apply")).to_be_enabled()
        app.locator("#sort-apply").click()
        assert not page.evaluate("window.__davCalls.some(x => x.method === 'PROPPATCH')")
        assert "Keine Änderung vorgenommen" in app.locator("#status").inner_text()
        assert errors == [], errors
    finally:
        context.close()


def confirmed_sort_and_restore(browser):
    context, page, app, errors = setup_case(browser, True)
    try:
        app.locator("#sort-check").click()
        expect(app.locator("#sort-apply")).to_be_enabled()
        app.locator("#sort-apply").click()
        expect(app.locator("#sort-restore")).to_be_enabled()
        success = app.locator("#status").inner_text()
        assert "erfolgreich gespeichert und kontrolliert" in success, success
        assert page.evaluate("JSON.stringify(window.__davOrders)") == '{"Zeta":2,"Alpha":0,"Mitte":1}'
        # The explicit restore flow verifies the saved original server order.
        app.locator("#sort-restore").click()
        restored = app.locator("#status").inner_text()
        assert "Vorherige Reihenfolge wiederhergestellt" in restored, restored
        assert page.evaluate("JSON.stringify(window.__davOrders)") == '{"Zeta":0,"Alpha":1,"Mitte":2}'
        assert errors == [], errors
    finally:
        context.close()


def failed_rollback(browser):
    context, page, app, errors = setup_case(browser, True, "rollback-fails")
    try:
        app.locator("#sort-check").click()
        expect(app.locator("#sort-apply")).to_be_enabled()
        app.locator("#sort-apply").click()
        expect(app.locator("#sort-apply")).to_be_disabled()
        result = app.locator("#status").inner_text()
        assert "Sortierung fehlgeschlagen" in result
        assert "Rücknahme für 1 Kalender fehlgeschlagen" in result
        assert page.evaluate("window.__davWriteCount") >= 2
        assert errors == [], errors
    finally:
        context.close()


def failed_server_write(browser):
    context, page, app, errors = setup_case(browser, True, "fail-after-write")
    try:
        app.locator("#sort-check").click()
        expect(app.locator("#sort-apply")).to_be_enabled()
        app.locator("#sort-apply").click()
        expect(app.locator("#sort-apply")).to_be_disabled()
        result = app.locator("#status").inner_text()
        assert "Sortierung fehlgeschlagen" in result, result
        assert "erfolgreich gespeichert" not in result
        # The fake server accepted the first write before returning an HTTP 500.
        # Rollback should attempt to restore the old position.
        assert page.evaluate("window.__davWriteCount") >= 2
        assert page.evaluate("JSON.stringify(window.__davOrders)") == '{"Zeta":0,"Alpha":1,"Mitte":2}'
        assert errors == [], errors
    finally:
        context.close()


with sync_playwright() as pw:
    args = {"headless": True, "args": ["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():
        args["executable_path"] = "/usr/bin/chromium"
    browser = pw.chromium.launch(**args)
    try:
        check_no_write(browser, "normal")
        check_no_write(browser, "missing")
        check_no_write(browser, "invalid-order")
        check_no_write(browser, "read-error")
        denied_confirmation(browser)
        confirmed_sort_and_restore(browser)
        failed_server_write(browser)
        failed_rollback(browser)
    finally:
        browser.close()
print("PASS: CalDAV read-only, invalid/missing/network error, consent, successful restore, partial writes, failed rollback")
