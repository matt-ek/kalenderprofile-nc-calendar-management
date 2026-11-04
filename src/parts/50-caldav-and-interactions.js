  // CalDAV is a supported persistent property, unlike client DOM ordering.
  // Read only first; NEVER write on opening the bookmarklet.
  function davBase() {
    if(currentUser==='unbekannt') throw Error('Nextcloud-Benutzerkennung nicht ermittelbar.');
    const url=typeof window.OC?.generateRemoteUrl==='function'
      ? window.OC.generateRemoteUrl('dav').replace(/\/$/,'')
      : location.origin+(location.pathname.split(/\/(?:index\.php\/)?apps\/calendar/)[0]||'')+'/remote.php/dav';
    const home=new URL(url.replace(/\/$/,'')+'/calendars/'+encodeURIComponent(currentUser)+'/',location.href);
    if(home.origin!==location.origin || !/\/remote\.php\/dav\/calendars\/[^/]+\/$/.test(home.pathname)) throw Error('Nicht erlaubter CalDAV-Pfad.');
    return home;
  }
  async function davRequest(url,method,body,depth) {
    const headers={'Content-Type':'application/xml; charset=utf-8'};
    if(depth!==undefined) headers.Depth=String(depth);
    const token=window.OC?.requestToken||document.querySelector('head meta[name="requesttoken"]')?.content;
    if(token) headers.requesttoken=token;
    const res=await fetch(url,{method,headers,body,credentials:'same-origin',redirect:'error',cache:'no-store'});
    const text=await res.text();
    if(!res.ok && res.status!==207) throw Error(method+' HTTP '+res.status);
    if(text && /<html[\s>]/i.test(text.slice(0,1024))) throw Error('Statt DAV-Antwort wurde HTML geliefert – Sitzung oder Berechtigung prüfen.');
    return {status:res.status,text};
  }
  const davReadXml=`<?xml version="1.0"?><d:propfind xmlns:d="DAV:" xmlns:cal="urn:ietf:params:xml:ns:caldav" xmlns:a="http://apple.com/ns/ical/" xmlns:o="http://owncloud.org/ns"><d:prop><d:displayname/><d:resourcetype/><a:calendar-order/><a:calendar-color/><o:owner-principal/><cal:supported-calendar-component-set/></d:prop></d:propfind>`;
  const nsDav='DAV:',nsIcal='http://apple.com/ns/ical/';
  function parseDav(xmlString,base) {
    const doc=new DOMParser().parseFromString(xmlString,'application/xml');
    if(doc.querySelector('parsererror')) throw Error('Ungültige CalDAV-XML-Antwort.');
    const output=[];
    for(const response of [...doc.getElementsByTagNameNS(nsDav,'response')]) {
      const href=response.getElementsByTagNameNS(nsDav,'href')[0]?.textContent||'';
      if(!href)continue;
      const url=new URL(href,base);
      if(url.origin!==location.origin||!url.pathname.startsWith(base.pathname)||url.pathname===base.pathname)continue;
      const good=[...response.getElementsByTagNameNS(nsDav,'propstat')].find(p=>/\s200\b/.test(p.getElementsByTagNameNS(nsDav,'status')[0]?.textContent||''));
      if(!good) continue;
      const prop=good.getElementsByTagNameNS(nsDav,'prop')[0];if(!prop)continue;
      const value=(ns,tag)=>prop.getElementsByTagNameNS(ns,tag)[0]?.textContent?.trim()||'';
      const kinds=[...prop.getElementsByTagNameNS('urn:ietf:params:xml:ns:caldav','comp')].map(x=>x.getAttribute('name'));
      const hrefResource=prop.getElementsByTagNameNS(nsDav,'resourcetype')[0];
      const hasCollection=hrefResource?.getElementsByTagNameNS(nsDav,'collection').length;
      if(!hasCollection)continue;
      const displayName=value(nsDav,'displayname');
      if(!displayName)continue;
      let source='personal';
      if(url.pathname.includes('app-generated--deck--board')) source='deck';
      else if(kinds.includes('VTODO')&&!kinds.includes('VEVENT')) source='tasks';
      else {
        const owner=value('http://owncloud.org/ns','owner-principal');
        if(owner && !decodeURIComponent(owner).replace(/\/$/,'').endsWith('/'+currentUser)) source='shared';
      }
      const rawOrder=value(nsIcal,'calendar-order');
      // '' and whitespace are not zero. Reject non-integers and unsafe numbers.
      const order=/^(0|[1-9][0-9]*)$/.test(rawOrder)?Number(rawOrder):NaN;
      output.push({url:url.href,name:cleanName(displayName.replace(/^Deck:\s*/i,'')),source,
        order:Number.isSafeInteger(order)?order:NaN,color:value(nsIcal,'calendar-color')});
    }
    return output;
  }
  async function verifyPersonalCalendar() {
    if(!personalCandidate || currentUser==='unbekannt') throw Error('Persönlicher Kalender nicht eindeutig erkennbar.');
    const base=davBase();
    const response=await davRequest(base.href,'PROPFIND',davReadXml,1);
    if(response.status!==207) throw Error('CalDAV-Leseprüfung lieferte keine gültige Antwort.');
    const rows=parseDav(response.text,base);
    const matches=rows.filter(x=>x.source==='personal' && norm(x.name)===norm(personalCandidate.name) &&
      /\/(?:personal|persnlich|persoenlich)\/$/i.test(new URL(x.url).pathname));
    if(matches.length!==1 || rows.filter(x=>x.source==='personal'&&norm(x.name)===norm(personalCandidate.name)).length!==1)
      throw Error('Der Standardkalender „Persönlich“ konnte nicht zweifelsfrei anhand Name, Besitz und CalDAV-Adresse bestätigt werden.');
    return personalCandidate.key;
  }
  async function verifyAndProtectPersonal(notify=false) {
    if(personalChecking||!personalCandidate||!alwaysVisibleKeys.has(personalCandidate.key)) return;
    personalChecking=true;personalVerifyError='';renderAlwaysVisible();
    const key=personalCandidate.key;
    try {
      await verifyPersonalCalendar();
      if(alwaysVisibleKeys.has(key)&&personalCandidate?.key===key){personalVerified=true;renderAll();if(notify)status('Persönlicher Kalender über CalDAV geprüft und geschützt.');}
    } catch(e){
      personalVerified=false;personalVerifyError=String(e.message||e);
      renderAll();if(notify)status('Persönlicher Kalender nicht automatisch geschützt: '+personalVerifyError);
} finally {personalChecking=false;renderAlwaysVisible();}
  }
  function davMapping(rows) {
    const seen=new Set(),mapped=[];
    const already=new Set();
    for(const item of items){
      if(item.ambiguous||!item.key)throw Error('Mindestens ein Kalender ist im Browser nicht eindeutig.');
      // First match source + exact displayed name, then unique exact name.
      let choices=rows.filter(x=>!seen.has(x.url)&&x.source===item.source&&norm(x.name)===norm(item.name));
      if(choices.length!==1){
        const exact=rows.filter(x=>!seen.has(x.url)&&norm(x.name)===norm(item.name));
        if(exact.length===1)choices=exact;
      }
      if(choices.length!==1)throw Error('Keine eindeutige DAV-Zuordnung für „'+item.name+'“ ('+item.source+').');
      const cal=choices[0];
      if(!Number.isFinite(cal.order))throw Error('Fehlende Kalenderreihenfolge bei „'+item.name+'“.');
      seen.add(cal.url);mapped.push({item,cal});
    }
    if(mapped.length!==items.length || new Set(mapped.map(x=>x.cal.url)).size!==items.length)throw Error('DAV-Zuordnung nicht vollständig.');
    return mapped;
  }
  async function probeDav(silent=false) {
    davProbe=null;renderSort();
    const base=davBase();
    const res=await davRequest(base.href,'PROPFIND',davReadXml,1);
    if(res.status!==207)throw Error('Ungewöhnlicher PROPFIND-Status: '+res.status);
    const rows=parseDav(res.text,base);
    const mapped=davMapping(rows);
    davProbe={valid:true,base:base.href,mapped};
    renderSort();
    if(!silent)status('CalDAV erfolgreich geprüft: '+mapped.length+' Kalender eindeutig zugeordnet. Keine Änderung vorgenommen.');
    return davProbe;
  }
  async function writeOrder(url,order) {
    if(!Number.isSafeInteger(order)||order<0)throw Error('Ungültiger CalDAV-Sortierwert.');
    const target=new URL(url,location.href),base=davBase();
    if(target.origin!==base.origin||!target.pathname.startsWith(base.pathname)||target.pathname===base.pathname)
      throw Error('CalDAV-Ziel außerhalb des eigenen Kalenderverzeichnisses.');
    const body=`<?xml version="1.0"?><d:propertyupdate xmlns:d="DAV:" xmlns:a="http://apple.com/ns/ical/"><d:set><d:prop><a:calendar-order>${order}</a:calendar-order></d:prop></d:set></d:propertyupdate>`;
    const res=await davRequest(target.href,'PROPPATCH',body);
    if(res.status===207){
      const doc=new DOMParser().parseFromString(res.text,'application/xml');
      if(doc.querySelector('parsererror'))throw Error('Ungültige CalDAV-Antwort nach PROPPATCH.');
      const props=[...doc.getElementsByTagNameNS(nsDav,'propstat')];
      const orderProps=props.filter(x=>x.getElementsByTagNameNS(nsIcal,'calendar-order').length>0);
      if(!orderProps.length||orderProps.some(x=>!/\s(?:200|204)\b/.test(x.getElementsByTagNameNS(nsDav,'status')[0]?.textContent||'')))
        throw Error('CalDAV hat die calendar-order-Eigenschaft nicht erfolgreich bestätigt.');
    }
  }
  async function checkDav() {
    if(busy)return;
    setBusy(true);
    status('CalDAV-Kalender werden nur gelesen …');
    try{await probeDav();}
    catch(error){davProbe=null;status('CalDAV-Prüfung nicht erfolgreich: '+(error?.message||error));}
    finally{setBusy(false);}
  }
  async function applySort() {
    if(busy)return;
    if(!davProbe?.valid){status('Zunächst „CalDAV prüfen“ verwenden.');return;}
    const expected=sortPlanItems().map(x=>x.key);
    // Refresh before any write to detect changed calendar list / names / permissions.
    setBusy(true);
    status('CalDAV-Zuordnung wird vor Übernahme aktualisiert …');
    try {
      const check=await probeDav(true);
      const byKey=new Map(check.mapped.map(x=>[x.item.key,x.cal]));
      const oldByKey=new Map(check.mapped.map(x=>[x.item.key,x.cal.order]));
      const newOrder=expected.map((key,i)=>({key,cal:byKey.get(key),order:i}));
      if(newOrder.some(x=>!x.cal))throw Error('Kalenderliste hat sich verändert.');
      const liveRank=[...check.mapped].sort((a,b)=>a.cal.order-b.cal.order).map(x=>x.item.key);
      if(liveRank.every((k,i)=>k===expected[i])) {status('Diese Reihenfolge ist bereits auf dem Server gespeichert.');return;}
      const updates=newOrder.filter(x=>x.cal.order!==x.order);
      if(!updates.length){status('Die Kalender sind bereits in der gewünschten Reihenfolge.');return;}
      if(!confirm('Soll die Reihenfolge von '+updates.length+' Kalendern serverseitig per CalDAV geändert werden? Dies betrifft deine Kalenderansicht und ist keine reine Browser-Einstellung.')){
        status('Keine Änderung vorgenommen.');return;
      }
      // Save the original server order before the first write; users can restore later.
      try{localStorage.setItem(sortBackupKey,JSON.stringify({version:1,created:new Date().toISOString(),entries:check.mapped.map(x=>({key:x.item.key,url:x.cal.url,order:x.cal.order}))}));}
      catch(error){status('Sicherheitskopie der Reihenfolge konnte nicht lokal gespeichert werden. Keine Änderung vorgenommen.');return;}
      let changed=[];
      try{
        status('Kalenderreihenfolge wird gespeichert …');
        for(const entry of updates){
          changed.push(entry); // includes uncertain server writes if the response fails
          await writeOrder(entry.cal.url,entry.order);
        }
        const verified=await probeDav(true);
        const result=new Map(verified.mapped.map(x=>[x.item.key,x.cal.order]));
        const mismatch=newOrder.filter(x=>result.get(x.key)!==x.order);
        if(mismatch.length)throw Error('Überprüfung meldet '+mismatch.length+' abweichende Kalenderpositionen.');
        sortReloadRequired=true;
        status('Sortierung von '+updates.length+' Kalendern erfolgreich gespeichert und kontrolliert. Kalenderansicht über den neuen Button neu laden.');
      }catch(error){
        const failed=[];
        for(const entry of changed.reverse()){
          try{await writeOrder(entry.cal.url,oldByKey.get(entry.key));}catch(e){failed.push(entry.item?.name||entry.key);}
        }
        throw Error(String(error.message||error)+(failed.length?'; Rücknahme für '+failed.length+' Kalender fehlgeschlagen.':' ; bereits geschriebene Änderungen wurden nach Möglichkeit zurückgenommen.'));
      }
    }catch(error){davProbe=null;status('Sortierung fehlgeschlagen: '+(error?.message||error));}
    finally{setBusy(false);renderSort();}
  }
  async function restoreSort(){
    if(busy)return;
    const backup=getSortBackup();
    if(!backup){status('Keine lokale Sicherung der letzten Sortierung gefunden.');return;}
    if(!confirm('Die letzte vor dem Sortieren gesicherte Reihenfolge wiederherstellen? Das ändert die Kalendereinstellungen auf dem Nextcloud-Server.'))return;
    setBusy(true);status('Vorherige Reihenfolge wird geprüft …');
    try{
      const probe=await probeDav(true);
      const currentByKey=new Map(probe.mapped.map(x=>[x.item.key,x.cal]));
      if(backup.entries.length!==probe.mapped.length||backup.entries.some(x=>currentByKey.get(x.key)?.url!==x.url||!Number.isSafeInteger(x.order)||x.order<0))
        throw Error('Gesicherte und aktuelle Kalenderzuordnungen stimmen nicht vollständig überein.');
      const updates=backup.entries.filter(x=>currentByKey.get(x.key).order!==x.order);
      const attempted=[];
      try{
        for(const entry of updates){
          attempted.push(entry);
          await writeOrder(entry.url,entry.order);
        }
        const verify=await probeDav(true);
        const after=new Map(verify.mapped.map(x=>[x.item.key,x.cal.order]));
        if(backup.entries.some(x=>after.get(x.key)!==x.order))throw Error('Wiederherstellung nicht vollständig.');
      }catch(error){
        const failed=[];
        for(const entry of attempted.reverse()){
          try{await writeOrder(entry.url,currentByKey.get(entry.key).order);}
          catch(e){failed.push(entry.key);}
        }
        throw Error((error?.message||error)+(failed.length?' Rücknahme für '+failed.length+' Kalender fehlgeschlagen; Serverzustand prüfen.':' Vorherige Serverwerte nach Möglichkeit wiederhergestellt; Zustand prüfen.'));
      }
      try{localStorage.removeItem(sortBackupKey);}catch(e){}
      sortReloadRequired=true;
      status('Vorherige Reihenfolge wiederhergestellt. Kalenderansicht über den neuen Button neu laden.');
    }catch(e){status('Wiederherstellung fehlgeschlagen bzw. unvollständig: '+(e.message||e));}
    finally{setBusy(false);renderSort();}
  }
  shadow.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>switchTab(b.dataset.tab)));
  for(const id of ['presets','presets-individual']) el(id).addEventListener('change',e=>usePreset(e.target.value));
  for(const id of ['saved-profiles','saved-profiles-individual'])
    el(id).addEventListener('change',e=>{
      if(e.target.value)usePreset('saved:'+e.target.value);
      else {choice='manual';selectionKind='manual';syncSummaryFromManual();commitSelection();}
    });
  for (const [control, field] of [['include-deck','deck'], ['include-tasks','tasks'], ['include-personal','personal'], ['include-shared','shared'], ['include-common','common']]) {
    el(control).addEventListener('change',event => {
      if(selectionKind==='manual') {
        for(const item of getAll(field==='common'?'common':field)) {
          if(event.target.checked) selected.add(item.key); else selected.delete(item.key);
        }
        choice='manual';syncSummaryFromManual();commitSelection();return;
      }
      if (field === 'deck') includeDeck = event.target.checked;
      else if (field === 'tasks') includeTasks = event.target.checked;
      else if (field === 'personal') includePersonal = event.target.checked;
      else if (field === 'shared') includeShared = event.target.checked;
      else includeCommon = event.target.checked;
      choice='criteria';selectionKind='criteria';recomputeCriteria();commitSelection();
    });
  }
  for (const [control,dimension,all] of [
    ['areas-all','areas',true], ['areas-none','areas',false],
    ['types-all','types',true], ['types-none','types',false],
  ]) {
    el(control).addEventListener('click',()=> {
      if(selectionKind==='manual') {
        const scope=items.filter(x=>!x.ambiguous&&x.source!=='deck'&&x.source!=='tasks'&&(dimension==='areas'?!!areaOf(x.name):!!typeOf(x.name)));
        for(const item of scope) {if(all)selected.add(item.key);else selected.delete(item.key);}
        choice='manual';syncSummaryFromManual();commitSelection();return;
      }
      if (dimension==='areas') selectedAreas=new Set(all?allAreas:[]);
      else selectedTypes=new Set(all?allTypes:[]);
      selectionKind='criteria';choice='criteria';recomputeCriteria();commitSelection();
    });
  }
  el('sort-mode').addEventListener('change',e=>{
    sortMode=e.target.value;
    if(sortMode==='home'&&!homeArea){status('Bitte zuerst unter Setup einen bevorzugten Bereich festlegen.');sortMode='original';el('sort-mode').value=sortMode;return;}
    if(sortMode) replan(sortedItems(sortMode));
  });
  el('sort-pin-always').addEventListener('click',()=>{
    const always=items.filter(x=>!x.ambiguous&&x.key&&alwaysVisibleKeys.has(x.key));
    if(!always.length)return;
    const release=always.every(x=>sortPinned.has(x.key));
    let changed=0;
    for(const item of always){
      if(release){if(sortPinned.delete(item.key))changed++;}
      else if(!sortPinned.has(item.key)){sortPinned.add(item.key);changed++;}
    }
    currentSortSet='';commitSort();status(changed+' immer angezeigte Kalender '+(release?'in der Sortierung freigegeben.':'in der Sortierung fixiert.')+' Keine Serveränderung.');
  });
  el('sort-reset').addEventListener('click',()=>{
    sortPinned.clear();sortMode='original';el('sort-mode').value=sortMode;
    sortPlan=items.map(x=>x.key);currentSortSet='';commitSort();status('Reihenfolge und Fixierungen lokal zurückgesetzt.');
  });
  el('sort-sets').addEventListener('change',e=>{
    const saved=sortSets.find(x=>x.id===e.target.value);if(!saved)return;
    const existing=new Set(items.map(x=>x.key));
    sortPlan=[...saved.keys.filter(k=>existing.has(k)),...items.map(x=>x.key).filter(k=>!saved.keys.includes(k))];
    sortPinned=new Set(saved.pinned.filter(k=>existing.has(k)));
    sortMode='manual';el('sort-mode').value='manual';currentSortSet=saved.id;
    const missing=saved.keys.filter(k=>!existing.has(k)).length;
    commitSort();status('Sortier-Set „'+saved.label+'“ geladen.'+(missing?' '+missing+' alte Kalender nicht vorhanden.':'')+' Keine Serveränderung.');
  });
  el('sort-save-set').addEventListener('click',()=>{
    const existing=sortSets.find(x=>x.id===currentSortSet);
    const value=prompt('Name für das Sortier-Set:',existing?.label||'Meine Sortierung');if(value===null)return;
    const label=cleanName(value).slice(0,60);if(!label)return status('Ein Name ist erforderlich.');
    if(sortSets.some(x=>x.id!==currentSortSet&&norm(x.label)===norm(label)))return status('Der Name ist bereits vergeben.');
    if(!existing&&sortSets.length>=50)return status('Maximal 50 Sortier-Sets möglich.');
    const id=existing?.id||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const updated={id,label,keys:sortPlanItems().map(x=>x.key),pinned:[...sortPinned]};
    const previous=sortSets.slice();sortSets=existing?sortSets.map(x=>x.id===id?updated:x):[...sortSets,updated];
    if(!persistSortSets()){sortSets=previous;return status('Sortier-Set konnte nicht gespeichert werden.');}
    currentSortSet=id;commitSort();status('Sortier-Set „'+label+'“ lokal gespeichert.');offerExport('Sortier-Set');
  });
  el('sort-refresh-page').addEventListener('click',()=>location.reload());
  el('reload-individual').addEventListener('click',()=>el('reload').click());
  el('sort-copy').addEventListener('click',async()=>{
    const lines=[];
    let section='';
    for(const item of sortPlanItems()){
      if(item.source!==section){section=item.source;lines.push('',{personal:'Eigene Kalender',shared:'Geteilte Kalender',deck:'Deck',tasks:'Aufgaben',unknown:'Sonstige'}[section]||section);}
      lines.push('  '+item.name);
    }
    const copy='Kalenderprofile – individuelle Sortierliste\n'+lines.join('\n');
    try{await navigator.clipboard.writeText(copy);status('Sortierliste kopiert. Du kannst sie als Anleitung für Drag-and-drop verwenden.');}
    catch(error){prompt('Sortierliste zum Kopieren:',copy);status('Sortierliste zur manuellen Übernahme angezeigt.');}
  });
  el('sort-apply').addEventListener('click',applySort);
  el('sort-check').addEventListener('click',checkDav);
  el('sort-restore').addEventListener('click',restoreSort);
  for(const id of ['all','all-individual'])el(id).addEventListener('click',()=>usePreset('built:all'));
  for(const id of ['none','none-individual'])el(id).addEventListener('click',()=>usePreset('built:none'));
  function refreshDetectedItems() {
    const fresh=collectCalendars();
    if(!fresh.length)return false;
    items=fresh;invalidateClassification();
    ambiguous=items.filter(x=>x.ambiguous);
    personalCandidate=detectPersonalCandidate();
    const present=new Set(items.map(x=>x.key));
    sortPlan=[...sortPlan.filter(x=>present.has(x)),...items.map(x=>x.key).filter(x=>!sortPlan.includes(x))];
    sortPinned=new Set([...sortPinned].filter(x=>present.has(x)));
    davProbe=null;
    personalVerified=false;personalVerifyError='';
    return true;
  }
  el('reload').addEventListener('click',()=>{
    if(!refreshDetectedItems())return status('In der aktuellen Ansicht wurden keine Kalender erkannt.');
    selected=new Set(items.filter(x=>!x.ambiguous&&isEnabled(x)).map(x=>x.key));
    choice='manual';selectionKind='manual';syncSummaryFromManual();commitSelection();
    status('Aktuelle Kalenderansicht mit '+items.length+' Kalendern übernommen; Anzahl und Verfügbarkeit aktualisiert.');
    if(personalCandidate && alwaysVisibleKeys.has(personalCandidate.key)) verifyAndProtectPersonal();
  });
  el('individual-release-fixed').addEventListener('click',()=>{
    if(busy)return;
    const fixed=visibleIndividualItems().filter(item=>!item.ambiguous&&item.key&&alwaysVisibleKeys.has(item.key)&&!temporarilyReleasedKeys.has(item.key));
    if(!fixed.length)return status('Für die angezeigten Kalender besteht keine aktive Fixierung.');
    const names=fixed.map(item=>item.name).join(', ');
    if(!confirm('Die Fixierung für '+fixed.length+' angezeigte(n) Kalender NUR BIS ZUM SCHLIESSEN dieses Bookmarklets aussetzen?\n\n'+names+'\n\nDie Setup-Einstellungen bleiben unverändert. Die Kalender können in dieser Sitzung abgewählt werden. Beim nächsten Öffnen sind sie wieder geschützt.'))return;
    for(const item of fixed)temporarilyReleasedKeys.add(item.key);
    renderAll();
    status(fixed.length+' Fixierung(en) nur für diese Sitzung ausgesetzt. Die Setup-Konfiguration bleibt unverändert.');
  });
  el('individual-toggle-visible').addEventListener('click',()=>{
    if(busy)return;
    const visible=visibleIndividualItems().filter(item=>!item.ambiguous&&item.key&&!isAlwaysVisible(item.key));
    if(!visible.length)return;
    const allSelected=visible.every(item=>selected.has(item.key));
    for(const item of visible){if(allSelected)selected.delete(item.key);else selected.add(item.key);}
    choice='manual';selectionKind='manual';syncSummaryFromManual();commitSelection();
    status(visible.length+' angezeigte Kalender '+(allSelected?'abgewählt':'ausgewählt')+'. Nicht angezeigte Kalender und Setup-Fixierungen bleiben unverändert.');
  });
  el('search').addEventListener('input',renderList);
  shadow.querySelectorAll('.individual-filter').forEach(details=>details.addEventListener('toggle',()=>{
    if(details.open)shadow.querySelectorAll('.individual-filter').forEach(other=>{if(other!==details)other.open=false;});
  }));
  shadow.addEventListener('pointerdown',event=>{
    if(!event.target.closest('.individual-filter'))shadow.querySelectorAll('.individual-filter').forEach(details=>details.open=false);
  });
  for(const kind of ['areas','types','extras'])el('individual-'+kind+'-reset').addEventListener('click',()=>{
    individualFilters[kind].clear();renderIndividualFilters();renderList();
  });
  el('individual-filters-reset').addEventListener('click',()=>{
    for(const group of Object.values(individualFilters))group.clear();
    el('search').value='';renderIndividualFilters();renderList();
    shadow.querySelectorAll('.individual-filter').forEach(details=>details.open=false);
  });
