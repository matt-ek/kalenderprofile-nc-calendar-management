"""Browser regression: versioned, offline installer with drag-and-drop and copy/paste."""
from pathlib import Path
from playwright.sync_api import sync_playwright, expect

ROOT = Path(__file__).resolve().parents[1]
INSTALLER = (ROOT / "install/installation.html").resolve()
EXPECTED_VERSION = "2.0.4"

with sync_playwright() as playwright:
    launch_options = {"headless": True, "args": ["--no-sandbox"]}
    if Path("/usr/bin/chromium").exists():
        launch_options["executable_path"] = "/usr/bin/chromium"
    browser = playwright.chromium.launch(**launch_options)
    try:
        for width, height in [(1440, 900), (390, 844)]:
            page = browser.new_page(viewport={"width": width, "height": height})
            errors = []
            external_requests = []
            page.on("pageerror", lambda e: errors.append(str(e)))
            page.on("request", lambda request: external_requests.append(request.url)
                    if request.url.startswith(("http://", "https://")) else None)
            page.goto(INSTALLER.as_uri())
            expect(page.locator("h1")).to_contain_text("Deine Kalender")
            expect(page.locator(".version")).to_have_text("Version " + EXPECTED_VERSION)
            expect(page.locator("#copy-bookmarklet")).to_be_visible()
            expect(page.locator("#bookmarklet-code")).to_be_visible()
            assert "Technik-Release Beta 15" not in page.locator("body").inner_text()
            assert "V2.0.1" not in page.locator("body").inner_text()
            bookmarklet = page.locator("a.bookmark").get_attribute("href")
            displayed = page.locator("#bookmarklet-code").input_value()
            assert bookmarklet == displayed, "Manual code must match the drag link byte-for-byte"
            assert bookmarklet.startswith("javascript:")
            assert len(bookmarklet) > 200_000
            assert EXPECTED_VERSION in bookmarklet
            assert page.locator("#bookmarklet-code").get_attribute("readonly") is not None
            assert not external_requests, external_requests
            # Both desktop and mobile viewports must avoid horizontal page scrolling.
            assert page.evaluate("document.documentElement.scrollWidth <= window.innerWidth + 1"), (
                f"Horizontal page overflow at {width}px"
            )
            # Simulated Clipboard API success.
            page.evaluate("""() => {
                Object.defineProperty(navigator, 'clipboard', {
                    configurable: true,
                    value: {writeText: async text => {window.__copied = text;}}
                });
            }""")
            page.locator("#copy-bookmarklet").click()
            assert page.evaluate("window.__copied") == bookmarklet
            expect(page.locator("#copy-status")).to_contain_text("Kopiert")

            # Explicitly reject clipboard permissions and verify the select/copy fallback.
            page.evaluate("""() => {
                Object.defineProperty(navigator, 'clipboard', {
                    configurable: true,
                    value: {writeText: async () => {throw new Error('Clipboard blocked');}}
                });
                Object.defineProperty(document, 'execCommand', {
                    configurable: true,
                    value: cmd => {
                        window.__fallbackCommand = cmd;
                        window.__fallbackSelected = document.activeElement.value;
                        return true;
                    }
                });
            }""")
            page.locator("#copy-bookmarklet").click()
            assert page.evaluate("window.__fallbackCommand") == "copy"
            assert page.evaluate("window.__fallbackSelected") == bookmarklet
            expect(page.locator("#copy-status")).to_contain_text("Kopiert")
            assert not errors, errors
            page.close()
    finally:
        browser.close()

print("PASS: installer desktop/mobile, dynamic version, identical manual URL, clipboard and fallback")
