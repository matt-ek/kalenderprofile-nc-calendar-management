  // The quick-view editor uses explicit Save: incomplete edits cannot affect live filters.
  const quickExtras=[['common','Allgemeine Kalender'],['personal','Eigene Kalender'],['shared','Geteilte Kalender'],['deck','Deck'],['tasks','Aufgaben']];
  function renderQuickGroupOptions(){
    const pick=el('quick-group'),old=pick.value;pick.replaceChildren();
    for(const group of quickGroups){const opt=document.createElement('option');opt.value=group;opt.textContent=group;pick.appendChild(opt);}
    if(quickGroups.includes(old))pick.value=old;
  }
  function buildQuickChecks(){
    for(const [target,options] of [['quick-areas',areas],['quick-types',types],['quick-extra',quickExtras]]){
      const parent=el(target);parent.replaceChildren();
      for(const [key,label] of options){
        const node=document.createElement('label'),input=document.createElement('input'),span=document.createElement('span');
        input.type='checkbox';input.value=key;span.textContent=label;span.title=label;node.append(input,span);parent.appendChild(node);
      }
    }
    renderQuickGroupOptions();
  }
  function quickMode(){return el('quick-mode').value;}
  function showQuickMode(){
    for(const mode of ['rules','keys'])el('quick-'+mode).hidden=quickMode()!==mode;
    if(quickMode()==='keys')renderQuickKeys();
  }
  function renderQuickKeys(){
    const list=el('quick-key-list'),q=norm(cleanName(el('quick-key-search').value));list.replaceChildren();
    for(const item of items){if(item.ambiguous||!item.key||!norm(item.name+' '+sourceLabel[item.source]).includes(q))continue;
      const label=document.createElement('label'),cb=document.createElement('input'),span=document.createElement('span');
      cb.type='checkbox';cb.checked=quickKeyDraft.has(item.key);cb.addEventListener('change',()=>{if(cb.checked)quickKeyDraft.add(item.key);else quickKeyDraft.delete(item.key);quickDirty=true;});
      span.textContent=item.name+' · '+(sourceLabel[item.source]||item.source);span.title=span.textContent;label.append(cb,span);list.appendChild(label);
    }
  }
  function quickChecked(id){return [...el(id).querySelectorAll('input:checked')].map(x=>x.value);}
  function renderQuickPicker(){
    const picker=el('quick-view-list'),query=norm(el('quick-view-search').value.trim());picker.replaceChildren();
    for(const group of quickGroups){
      const parent=document.createElement('optgroup');parent.label=group;
      quickViews.filter(v=>v.group===group&&norm(v.label).includes(query)).forEach(v=>{
        const opt=document.createElement('option');opt.value=v.id;opt.textContent=(v.visible?'':'○ ')+v.label+(v.visible?'':' · ausgeblendet');parent.append(opt);
      });if(parent.children.length)picker.append(parent);
    }
    picker.value=quickEditingId;
  }
  let categoryCreateMode=false;
  function updateCategoryButtons(){
    const selected=el('quick-category-list').value;
    const proposed=cleanName(el('quick-category-name').value);
    const exists=quickGroups.some(group=>norm(group)===norm(proposed));
    el('quick-category-new').disabled=quickGroups.length>=20;
    const action=el('quick-category-rename');
    action.textContent=categoryCreateMode?'Kategorie anlegen':'Umbenennen';
    action.disabled=!proposed||proposed.length>45||exists&&!(!categoryCreateMode&&norm(selected)===norm(proposed))||(!categoryCreateMode&&(!selected||norm(selected)===norm(proposed)))||(categoryCreateMode&&quickGroups.length>=20);
  }
  function renderQuickCategories(selected=el('quick-category-list').value){
    const picker=el('quick-category-list');picker.replaceChildren();
    for(const group of quickGroups){const opt=document.createElement('option');opt.value=group;opt.textContent=group+' ('+quickViews.filter(v=>v.group===group).length+')';picker.append(opt);}
    if(categoryCreateMode){picker.selectedIndex=-1;}
    else picker.value=quickGroups.includes(selected)?selected:quickGroups[0];
    el('quick-category-name').value=categoryCreateMode?'':picker.value||'';
    el('quick-category-mode-hint').textContent=categoryCreateMode?'Neue Kategorie: Name eingeben und unten auf „Kategorie anlegen“ klicken. Mit Auswahl einer vorhandenen Kategorie abbrechen.':'„+ Neu“ beginnt immer eine neue Kategorie mit leerem Eingabefeld.';
    el('quick-category-mode-hint').classList.toggle('setup-category-create-hint',categoryCreateMode);
    const index=quickGroups.indexOf(picker.value);
    el('quick-category-delete').disabled=categoryCreateMode||quickGroups.length<2;
    el('quick-category-up').disabled=index<=0;
    el('quick-category-down').disabled=index<0||index===quickGroups.length-1;
    el('quick-category-members').replaceChildren();
    const members=categoryCreateMode?[]:quickViews.filter(v=>v.group===picker.value);
    const target=el('quick-category-members');
    if(!members.length)target.textContent=categoryCreateMode?'Neue Kategorie – noch keine Schnellansichten zugeordnet.':'Keine Schnellansichten zugeordnet.';
    else for(const member of members){const line=document.createElement('div');line.textContent=member.label+(member.visible?'':' · ausgeblendet');target.appendChild(line);}
    updateCategoryButtons();
  }
  function loadQuickEditor(id=quickEditingId||quickViews[0]?.id){
    quickEditingId=id;quickEditorLoaded=true;quickDirty=false;
    const v=quickViews.find(v=>v.id===id);
    renderQuickPicker();renderQuickGroupOptions();renderQuickCategories();if(!v)return;
    el('quick-name').value=v.label;el('quick-group').value=v.group;el('quick-visible').checked=v.visible;
    const cfg=normalizeQuickConfig(v.config),mode=Array.isArray(cfg.keys)?'keys':'rules';
    el('quick-mode').value=mode;
    for(const [id,keys] of [['quick-areas',cfg.areas],['quick-types',cfg.types],['quick-extra',quickExtras.filter(([key])=>cfg[key]).map(([key])=>key)]])
      el(id).querySelectorAll('input').forEach(x=>{x.checked=keys.includes(x.value);});
    el('quick-planning').checked=cfg.planning===true;
    el('quick-unassigned').checked=cfg.unassigned===true;
    quickKeyDraft=new Set(cfg.keys||[]);el('quick-key-search').value='';showQuickMode();
    el('quick-delete').disabled=!id.startsWith('custom-');
    el('quick-editor-note').textContent=(id.startsWith('custom-')?'Eigene Ansicht':'Standardansicht – Änderungen bleiben nur lokal.')+' · '+presetCount(id)+' passende Kalender';
  }
  function quickConfigFromEditor(){
    const mode=quickMode(),cfg={areas:[],types:[]};
    if(mode==='keys')cfg.keys=[...quickKeyDraft];
    else{
      cfg.areas=quickChecked('quick-areas');cfg.types=quickChecked('quick-types');
      for(const [id] of quickExtras)cfg[id]=quickChecked('quick-extra').includes(id);
      cfg.planning=el('quick-planning').checked;
      cfg.unassigned=el('quick-unassigned').checked;
    }
    return cfg;
  }
  function quickSave(){
    const name=cleanName(el('quick-name').value);if(!name||name.length>70)return status('Bitte einen Namen mit maximal 70 Zeichen eingeben.');
    if(quickViews.some(v=>v.id!==quickEditingId&&norm(v.label)===norm(name)))return status('Der Name der Schnellansicht ist bereits vergeben.');
    const next=quickViews.map(v=>v.id!==quickEditingId?v:{...v,label:name,group:el('quick-group').value,visible:el('quick-visible').checked,config:quickConfigFromEditor()});
    if(!saveQuickViews(next))return status('Schnellansicht konnte nicht gespeichert werden.');
    if(choice==='built:'+quickEditingId&&!next.find(v=>v.id===quickEditingId)?.visible){choice='manual';selectionKind='manual';syncSummaryFromManual();persistDraft();}
    quickDirty=false;renderAll();loadQuickEditor(quickEditingId);
    status('Schnellansicht „'+name+'“ gespeichert. Die aktuell eingeblendeten Kalender wurden nicht verändert.');
    offerExport('Schnellansicht');
  }
  buildQuickChecks();
  el('quick-view-search').addEventListener('input',renderQuickPicker);
  el('quick-view-list').addEventListener('change',event=>{
    const id=event.target.value;
    if(quickDirty&&!confirm('Ungespeicherte Änderungen an der Schnellansicht verwerfen?')){event.target.value=quickEditingId;return;}
    loadQuickEditor(id);
  });
  el('quick-mode').addEventListener('change',()=>{quickDirty=true;showQuickMode();});
  el('quick-key-search').addEventListener('input',renderQuickKeys);
  for(const id of ['quick-name','quick-group','quick-visible','quick-planning','quick-unassigned','quick-areas','quick-types','quick-extra'])el(id).addEventListener('input',()=>{quickDirty=true;});
  el('quick-category-list').addEventListener('change',()=>{
    categoryCreateMode=false;
    renderQuickCategories(el('quick-category-list').value);
  });
  el('quick-category-name').addEventListener('input',updateCategoryButtons);
  function editCategory(action){
    if(quickDirty&&!confirm('Ungespeicherte Änderungen an der Schnellansicht verwerfen?'))return;
    if(action==='rename'&&categoryCreateMode)action='new';
    const selected=el('quick-category-list').value;
    const proposed=cleanName(el('quick-category-name').value).slice(0,45);
    if(action!=='delete'&&(!proposed||proposed.length>45))return status('Bitte einen gültigen Kategorienamen angeben.');
    if(action!=='delete'&&quickGroups.some(g=>norm(g)===norm(proposed)&&(action==='new'||g!==selected)))return status('Die Kategorie existiert bereits.');
    let groups=[...quickGroups],views=quickViews.map(v=>({...v})),focus=selected;
    if(action==='new'){
      if(groups.length>=20)return status('Maximal 20 Kategorien möglich.');
      groups.push(proposed);focus=proposed;
    }else if(action==='rename'){
      if(!selected)return;
      groups=groups.map(g=>g===selected?proposed:g);views=views.map(v=>v.group===selected?{...v,group:proposed}:v);focus=proposed;
    }else{
      if(groups.length<2)return status('Die letzte Kategorie kann nicht gelöscht werden.');
      const members=views.filter(v=>v.group===selected).length;
      if(members)return alert('Kategorie „'+selected+'“ enthält noch '+members+' Schnellansicht'+(members===1?'':'en')+'. Bitte zuerst alle enthaltenen Ansichten in eine andere Kategorie verschieben oder löschen.');
      if(!confirm('Leere Kategorie „'+selected+'“ wirklich löschen?'))return;
      groups=groups.filter(g=>g!==selected);focus=groups[0];
    }
    if(!saveQuickViews(views,groups))return status('Kategorien konnten nicht gespeichert werden.');
    categoryCreateMode=false;
    loadQuickEditor(quickEditingId);renderQuickCategories(focus);renderAll();
    status(action==='new'?'Kategorie hinzugefügt.':action==='rename'?'Kategorie umbenannt.':'Leere Kategorie gelöscht.');
  }
  el('quick-category-new').addEventListener('click',()=>{
    if(quickGroups.length>=20)return status('Maximal 20 Kategorien möglich.');
    categoryCreateMode=true;
    renderQuickCategories();
    el('quick-category-name').focus();
    status('Neue Kategorie: Namen eingeben und mit „Kategorie anlegen“ speichern.');
  });
  for(const [id,action] of [['quick-category-rename','rename'],['quick-category-delete','delete']])el(id).addEventListener('click',()=>editCategory(action));
  for(const [id,shift] of [['quick-category-up',-1],['quick-category-down',1]])el(id).addEventListener('click',()=>{
    if(quickDirty&&!confirm('Ungespeicherte Änderungen an der Schnellansicht verwerfen?'))return;
    const selected=el('quick-category-list').value,index=quickGroups.indexOf(selected),other=index+shift;
    if(index<0||other<0||other>=quickGroups.length)return;
    const groups=quickGroups.slice();[groups[index],groups[other]]=[groups[other],groups[index]];
    if(!saveQuickViews(quickViews,groups))return status('Kategorien konnten nicht sortiert werden.');
    loadQuickEditor(quickEditingId);renderQuickCategories(selected);renderAll();
    status('Kategorie verschoben. Die Reihenfolge ist lokal gespeichert.');
  });
  el('quick-save').addEventListener('click',quickSave);
  el('quick-new').addEventListener('click',()=>{
    if(quickViews.length>=60)return status('Maximal 60 Schnellansichten möglich.');
    if(quickDirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;
    const id='custom-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,7);
    const view={id,label:'Neue Schnellansicht',group:quickGroups[0],visible:false,config:{areas:[],types:[]}};
    if(!saveQuickViews([...quickViews,view]))return status('Neue Ansicht konnte nicht angelegt werden.');
    loadQuickEditor(id);el('quick-name').select();renderPresetList();status('Neue Schnellansicht angelegt. Bitte konfigurieren und speichern.');
  });
  el('quick-delete').addEventListener('click',()=>{
    if(!quickEditingId.startsWith('custom-'))return;
    if(!confirm('Eigene Schnellansicht endgültig löschen?'))return;
    if(!saveQuickViews(quickViews.filter(v=>v.id!==quickEditingId)))return status('Löschen fehlgeschlagen.');
    if(choice==='built:'+quickEditingId){choice='manual';selectionKind='manual';syncSummaryFromManual();persistDraft();}
    loadQuickEditor(quickViews[0]?.id);renderAll();status('Eigene Schnellansicht gelöscht.');
  });
  for(const [id,shift] of [['quick-up',-1],['quick-down',1]])el(id).addEventListener('click',()=>{
    if(quickDirty&&!confirm('Ungespeicherte Änderungen verwerfen?'))return;
    const v=quickViews.find(x=>x.id===quickEditingId);if(!v)return;
    const subset=quickViews.filter(x=>x.group===v.group),pos=subset.findIndex(x=>x.id===v.id),other=subset[pos+shift];
if(!other)return;
    const next=[...quickViews],a=next.findIndex(x=>x.id===v.id),b=next.findIndex(x=>x.id===other.id);
    [next[a],next[b]]=[next[b],next[a]];
    if(!saveQuickViews(next))return status('Reihenfolge konnte nicht gespeichert werden.');
    loadQuickEditor(v.id);renderPresetList();status('Schnellansicht verschoben.');
  });
  el('quick-reset').addEventListener('click',()=>{
    if(!confirm('Alle Schnellansichten einschließlich eigener Ansichten und Reihenfolge auf Standard zurücksetzen? Gespeicherte Profile und Sortier-Sets bleiben erhalten.'))return;
    if(!saveQuickViews(defaultQuickViews.map(x=>structuredClone(x)),[...defaultQuickGroups]))return status('Zurücksetzen fehlgeschlagen.');
    if(choice.startsWith('built:')&&!presetConfig(choice.slice(6))){choice='manual';selectionKind='manual';syncSummaryFromManual();persistDraft();}
    loadQuickEditor(defaultQuickViews[0].id);renderAll();status('Schnellansichten vollständig auf Standard zurückgesetzt.');
  });
  el('settings-export').addEventListener('click',()=>{try{downloadSettings();}catch(e){status('Export fehlgeschlagen: '+e.message);}});
  el('settings-import').addEventListener('click',()=>el('settings-file').click());
  el('settings-file').addEventListener('change',async event=>{
    const input=event.currentTarget;
    const file=input.files?.[0];
    try{await importSettings(file);}catch(e){status('Import fehlgeschlagen: '+e.message);}finally{input.value='';}
  });
  function saveProfile() {
    if (!selected.size && !confirm('Ein leeres Profil (alle Kalender ausgeschaltet) speichern?')) return;
    const existing=choice.startsWith('saved:')?profiles.find(x=>x.id===choice.slice(6)):null;
    const label=prompt('Name des Kalenderprofils:',existing?.label||'Meine Kalenderansicht');
    if(label===null)return;
    const name=cleanName(label).slice(0,60);
    if(!name)return status('Bitte einen Profilnamen eingeben.');
    if(profiles.some(x=>x.id!==existing?.id&&norm(x.label)===norm(name)))return status('Dieser Profilname existiert bereits.');
    if(!existing&&profiles.length>=80)return status('Maximal 80 Profile möglich.');
    const id=existing?.id||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const profile={id,label:name,keys:[...selected]};
    if(selectionKind==='criteria')profile.filters={areas:[...selectedAreas],types:[...selectedTypes],includeDeck,includeTasks,includePersonal,includeShared,includeCommon};
    const old=profiles.slice();
    profiles=existing?profiles.map(p=>p.id===id?profile:p):[...profiles,profile];
    if(!persist()){profiles=old;renderAll();return status('Profil konnte nicht gespeichert werden.');}
    choice='saved:'+id;persistDraft();renderAll();status('Profil „'+name+'“ '+(existing?'aktualisiert':'gespeichert')+'.');offerExport('Kalenderprofil');
  }
  for(const id of ['save','save-individual'])el(id).addEventListener('click',saveProfile);
  el('apply').addEventListener('click',apply);
  const close=()=>{if(!busy){host.__kpDispose?.();host.remove();}};
  el('close').addEventListener('click',close);
  shade.addEventListener('click',close);
  const onEscape=e=>{if(e.key==='Escape'&&host.isConnected){e.preventDefault();close();}};
  // Das iframe ist eine echte Event-Grenze: Parent-Listener sehen keine Tasten.
  // Escape schließt das Applet weiterhin, Standardverhalten der Eingaben bleibt.
  appDoc.defaultView.addEventListener('keydown',onEscape);
  host.contentWindow.focus();
  const resizePreview=()=>{if(previewFrame)cancelAnimationFrame(previewFrame);previewFrame=requestAnimationFrame(previewSizing);};
  window.addEventListener('resize',resizePreview,{passive:true});
  host.__kpDispose=()=>{
    window.removeEventListener('resize',resizePreview);
    appDoc.defaultView.removeEventListener('keydown',onEscape);
  };
  if(!restoreDraft())syncSummaryFromManual();
  renderAll();
  status(items.length+' Kalender gefunden · '+active.length+' von '+(items.length-ambiguous.length)+' eindeutigen derzeit aktiv');
  if(personalCandidate && alwaysVisibleKeys.has(personalCandidate.key) && currentUser!=='unbekannt') verifyAndProtectPersonal();
})();
