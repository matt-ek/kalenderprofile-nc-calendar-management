"""Regression: 2.0.1 Setup editor creates, edits and duplicates isolated records."""
from pathlib import Path
import json
from playwright.sync_api import sync_playwright

ROOT=Path(__file__).resolve().parents[1]
def app_locator_is_present(page):
    return page.locator('#nc-calendar-management-generic-v2').count() == 1
with sync_playwright() as pw:
    chromium_executable=Path('/usr/bin/chromium')
    launch_args={'headless':True,'args':['--no-sandbox']}
    if chromium_executable.exists():
        launch_args['executable_path']=str(chromium_executable)
    browser=pw.chromium.launch(**launch_args)
    page=browser.new_page(viewport={'width':1390,'height':1050},accept_downloads=True)
    errors=[]
    page.on('pageerror',lambda e:errors.append(str(e)))
    page.on('dialog',lambda d:d.accept())
    page.set_content('<html><head></head><body></body></html>')
    page.evaluate('''() => {
      const m=new Map();
      Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)}});
      window.OC={getCurrentUser:()=>({uid:'saved201'})};
      const root=document.createElement('div');root.className='calendar-list-wrapper';
      const names=['Persönlich','Team (HR)','Projekt (HR)','Besprechung (SALES)','Urlaub (SALES)','Aufgaben (IT)'];
      root.innerHTML=names.map((name,i)=>`<li class="draggable-calendar-list-item"><div class="app-navigation-entry"><span class="app-navigation-entry__name">${name}</span><span class="checkbox-marked-icon"></span></div></li>`).join('');
      document.body.appendChild(root);
    }''')
    page.evaluate((ROOT/'src/calendar-management-generic.js').read_text())
    assert app_locator_is_present(page), "Startup did not create the iframe"
    app=page.frame_locator('#nc-calendar-management-generic-v2').locator('#kalenderprofile-app')
    initial_selected=app.locator('#list input[type="checkbox"]:checked').count()
    app.locator('[data-tab="setup"]').click()
    app.locator('[data-setup-tab="saved"]').click()
    assert app.locator('#saved-manager-new').is_enabled()
    assert app.locator('#saved-manager-discard').count()==1
    assert app.locator('#close').count()==1
    app.locator('#saved-manager-new').click()
    assert app.locator('#saved-manager-name').input_value()==''
    app.locator('#saved-manager-name').fill('Meine zwei Kalender')
    assert app.locator('#saved-manager-calendar-list input[type="checkbox"]').count()>=6
    app.locator('#saved-manager-calendar-list label.item').filter(has_text='Team (HR)').locator('input').check()
    app.locator('#saved-manager-calendar-list label.item').filter(has_text='Projekt (HR)').locator('input').check()
    app.locator('#saved-manager-rename').click()
    assert app.locator('#saved-manager-list option').count()==1
    assert '2 von' in app.locator('#saved-manager-coverage').inner_text()
    original_id=app.locator('#saved-manager-list').input_value()
    assert original_id
    # Independent view filters do not mutate the saved calendar membership.
    app.locator('#saved-manager-search').fill('Team')
    assert app.locator('#saved-manager-calendar-list label.item').count()==1
    app.locator('#saved-manager-filters-reset').click()
    app.locator('#saved-manager-duplicate').click()
    assert app.locator('#saved-manager-list').input_value()==''
    assert 'Kopie' in app.locator('#saved-manager-name').input_value()
    app.locator('#saved-manager-calendar-list label.item').filter(has_text='Projekt (HR)').locator('input').uncheck()
    app.locator('#saved-manager-rename').click()
    assert app.locator('#saved-manager-list option').count()==2
    ids=app.locator('#saved-manager-list option').evaluate_all('(els)=>els.map(x=>x.value)')
    assert len(set(ids))==2
    dup_id=app.locator('#saved-manager-list').input_value()
    assert dup_id!=original_id
    app.locator('#saved-manager-list').select_option(original_id)
    assert '2 von' in app.locator('#saved-manager-coverage').inner_text()
    app.locator('#saved-manager-list').select_option(dup_id)
    assert '1 von' in app.locator('#saved-manager-coverage').inner_text()
    # Create dynamic profile with area/type filter UI.
    app.locator('#saved-manager-new').click()
    app.locator('#saved-manager-name').fill('Dynamische HR')
    app.locator('#saved-manager-mode').select_option('criteria')
    assert app.locator('#saved-manager-criteria').is_visible()
    app.locator('#saved-manager-criteria-areas input[type="checkbox"]').first.check()
    app.locator('#saved-manager-criteria-types input[type="checkbox"]').first.check()
    app.locator('#saved-manager-rename').click()
    dynamic_id=app.locator('#saved-manager-list').input_value()
    assert dynamic_id not in {dup_id,original_id}
    # New sorting set starts from current local order; changes stay in draft until save.
    app.locator('#saved-manager-kind').select_option('sorting')
    app.locator('#saved-manager-new').click()
    app.locator('#saved-manager-name').fill('Testsortierung')
    assert app.locator('#saved-manager-calendar-list .sort-row').count()==6
    app.locator('#saved-manager-calendar-list .sort-btn').first.click()
    app.locator('#saved-manager-rename').click()
    sort_id=app.locator('#saved-manager-list').input_value()
    app.locator('#saved-manager-duplicate').click()
    assert 'Kopie' in app.locator('#saved-manager-name').input_value()
    app.locator('#saved-manager-rename').click()
    assert app.locator('#saved-manager-list option').count()==2
    # Export confirms schema and independent records, without mutating active state.
    app.locator('[data-setup-tab="backup"]').click()
    with page.expect_download() as info:app.locator('#settings-export').click()
    import tempfile
    with tempfile.TemporaryDirectory() as tmp:
        file=Path(tmp)/'out.json';info.value.save_as(file)
        config=json.loads(file.read_text())
    profiles=config['settings']['profiles']; sets=config['settings']['sortSets']
    assert len(profiles)==3 and len(sets)==2
    orig=next(p for p in profiles if p['id']==original_id)
    copy=next(p for p in profiles if p['id']==dup_id)
    dynamic=next(p for p in profiles if p['id']==dynamic_id)
    assert len(orig['keys'])==2 and len(copy['keys'])==1
    assert dynamic['filters']['areas'] and dynamic['filters']['types']
    assert sort_id in [s['id'] for s in sets]
    # No active calendar changes by setup editing.
    assert len(config['settings']['selection']['keys'])==initial_selected
    assert not errors,errors
    print('SUCCESS: create, duplicate, fixed/dynamic profile, sort sets, JSON, isolated editor; no page errors')
    browser.close()
