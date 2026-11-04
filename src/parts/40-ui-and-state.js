  const el = id => shadow.getElementById(id);
  function status(s) { const node=el('status');node.textContent=s;node.title=s;node.setAttribute('aria-label',s); }
  let quickEditingId='',quickEditorLoaded=false,quickDirty=false,quickKeyDraft=new Set();
  let classificationDraft=structuredClone(rules);
  let classificationKind='areas',classificationEditingId='',classificationDirty=false,classificationLoaded=false;
  const classificationNewIds=new Set();
  // Remember the original identity of existing entries while a user edits them.
  // Renaming an ID is a migration, not deletion plus creation.
  const classificationOrigins=new WeakMap();
  function rememberClassificationOrigins(){
    for(const kind of ['areas','types'])for(const entry of classificationDraft[kind])
      classificationOrigins.set(entry,entry.id);
  }
  rememberClassificationOrigins();
  function classificationKey(kind,id){return kind+':'+id;}
  function classificationEntries(){return classificationDraft[classificationKind];}
  function classificationCurrent(){return classificationEntries().find(x=>x.id===classificationEditingId);}
  function classificationWords(value){return [...new Set(value.split(/[\n,;]+/).map(x=>cleanName(x)).filter(Boolean))];}
  function renderClassification(keepSelection=true){
    classificationLoaded=true;
    const entries=classificationEntries(),picker=el('classification-list');
    if(!keepSelection||!entries.some(x=>x.id===classificationEditingId))classificationEditingId=entries[0]?.id||'';
    el('classification-kind').value=classificationKind;
    picker.replaceChildren();
    for(const entry of entries){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label+' ('+entry.id+')';picker.append(option);}
    picker.value=classificationEditingId;
    const item=classificationCurrent(),isOther=classificationKind==='types'&&item?.id==='other';
    for(const id of ['classification-label','classification-id','classification-keywords'])el(id).disabled=!item;
    el('classification-label').value=item?.label||'';
    el('classification-id').value=item?.id||'';
    // All existing identifiers may be edited. The reserved fallback type 'other' is fixed.
    el('classification-id').readOnly=!!isOther;
    el('classification-keywords').value=item?.keywords.join('\n')||'';
    el('classification-keywords').disabled=!item||isOther;
    el('classification-common').value=classificationDraft.commonKeywords.join('\n');
    const idx=entries.findIndex(x=>x.id===classificationEditingId);
    el('classification-new').disabled=entries.length>=(classificationKind==='areas'?30:20);
    el('classification-up').disabled=idx<=0||isOther||entries[idx-1]?.id==='other';
    el('classification-down').disabled=idx<0||idx===entries.length-1||isOther||entries[idx+1]?.id==='other';
    el('classification-delete').disabled=!item||isOther;
    const proposals=areaProposalCodes.filter(code=>!configuredAreaForSuffix(code,classificationDraft));
    el('classification-detected').hidden=classificationKind!=='areas';
    const detectedPicker=el('classification-detected-list'),last=detectedPicker.value;
    detectedPicker.replaceChildren();
    for(const code of proposals){
      const option=document.createElement('option');option.value=code;
      const count=lastAreaScan?.counts.get(code)||0;
      option.textContent=code.toLocaleUpperCase(navigator.language||'de-DE')+(count?' · '+count+' Kalender':'');
      option.title=lastAreaScan?.examples.get(code)||'Vorschlag aus gespeichertem Suchlauf';
      detectedPicker.append(option);
    }
    if(proposals.includes(last))detectedPicker.value=last;
    el('classification-adopt').disabled=!proposals.length||classificationDraft.areas.length>=30;
    el('classification-dismiss').disabled=!proposals.length;
    const report=lastAreaScan;
    el('classification-proposal-note').textContent=proposals.length
      ?proposals.length+' Vorschlag/Vorschläge offen. Übernehmen oder verwerfen. '+(report?report.inspected+' Kalender geprüft; '+report.covered+' Kürzel bereits konfiguriert.':'Neue Suche nur per Button.')
      :(report?'Keine neuen Bereiche gefunden: '+report.inspected+' Kalender geprüft, bei '+report.withCodes+' ein auswertbares Kürzel/Präfix, '+report.covered+' Kürzel bereits konfiguriert. Andere Namen ggf. mit (CODE) oder „CODE – Termin“ strukturieren.':'Keine offenen Vorschläge. „Vorschläge ermitteln“ liest die aktuelle Kalenderliste erneut ein.');
    if(areaProposalStorageError)el('classification-proposal-note').textContent+=' Speicherung der Vorschlagsliste fehlgeschlagen.';
    el('classification-note').textContent=classificationDirty?'Nicht gespeichert – Änderungen wirken erst nach „Konfiguration speichern“.':'Bereiche und Kalenderarten sind lokal gespeichert. Änderungen beeinflussen keine Serverdaten.';
  }
  function markClassificationDirty(){classificationDirty=true;el('classification-note').textContent='Nicht gespeichert – Änderungen wirken erst nach „Konfiguration speichern“.';}
  function classificationSaveField(id){
    const item=classificationCurrent();if(!item)return;
    if(id==='classification-label')item.label=cleanName(el(id).value);
    if(id==='classification-keywords')item.keywords=classificationWords(el(id).value);
    markClassificationDirty();
    const option=[...el('classification-list').options].find(x=>x.value===item.id);
    if(option)option.textContent=(item.label||'(ohne Namen)')+' ('+item.id+')';
  }
  let currentSetupTab='general';
  function refreshSetupFooter(){
    const active=currentTab==='setup'?currentSetupTab:'';
    shadow.querySelectorAll('[data-setup-footer]').forEach(group=>group.hidden=group.dataset.setupFooter!==active);
  }
  function switchSetupTab(tab){
    if(!['general','classification','quick','categories','saved','backup'].includes(tab))return;
    currentSetupTab=tab;
    shadow.querySelectorAll('[data-setup-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.setupTab===tab)));
    shadow.querySelectorAll('[data-setup-panel]').forEach(section=>section.hidden=section.dataset.setupPanel!==tab);
    refreshSetupFooter();
    shadow.querySelector('.scroll').scrollTop=0;
    if(tab==='classification')renderClassification();
    if(tab==='categories')renderQuickCategories();
    if(tab==='saved')renderSavedManager();
    if(tab==='quick'&&!quickEditorLoaded)loadQuickEditor(quickEditingId||quickViews[0]?.id);
    if(previewFrame)cancelAnimationFrame(previewFrame);
    previewFrame=requestAnimationFrame(previewSizing);
  }
  shadow.querySelectorAll('[data-setup-tab]').forEach(button=>button.addEventListener('click',()=>switchSetupTab(button.dataset.setupTab)));
  function renderSetup(){
    if(!classificationLoaded)renderClassification();
    el('preferred-area').value=homeArea;
    el('settings-summary').textContent=profiles.length+' Kalenderprofile · '+sortSets.length+' Sortier-Sets · Benutzer: '+currentUser;
    renderAlwaysVisible();
    if(!quickEditorLoaded)loadQuickEditor(quickViews.some(v=>v.id===quickEditingId)?quickEditingId:quickViews[0]?.id);
  }
  el('classification-kind').addEventListener('change',e=>{classificationKind=e.target.value;classificationEditingId='';renderClassification(false);});
  el('classification-list').addEventListener('change',e=>{classificationEditingId=e.target.value;renderClassification();});
  for(const id of ['classification-label','classification-keywords'])el(id).addEventListener('input',()=>classificationSaveField(id));
  // An identifier is not tied to its generated placeholder (e.g. "bereich-1").
  // Keep the text field intact until Save, and read its *current value* during
  // Save even if the browser did not emit a change/blur event beforehand.
  function commitClassificationIdentifier(){
    const item=classificationCurrent();if(!item)return true;
    const field=el('classification-id');
    const next=field.value.trim().toLowerCase();
    let error='';
    if(classificationKind==='types'&&item.id==='other'&&next!=='other')
      error='Die technische Kennung „other“ darf nicht geändert werden.';
    else if(!/^[a-z][a-z0-9_-]{0,35}$/.test(next)||next==='unassigned')
      error='Ungültige Kennung „'+field.value+'“. Erlaubt sind a–z, 0–9, _ und -, beginnend mit einem Buchstaben (maximal 36 Zeichen).';
    else if(classificationEntries().some(x=>x!==item&&x.id===next))
      error='Die Kennung „'+next+'“ wird bereits von einem anderen Eintrag verwendet. Bitte eine freie Kennung wählen.';
    if(error){
      field.setAttribute('aria-invalid','true');
      el('classification-note').textContent=error;
      status(error);
      return false; // Never silently replace the edited value with "bereich-1".
    }
    field.removeAttribute('aria-invalid');
    field.value=next;
    if(next===item.id)return true;
    const previous=item.id;
    item.id=next;
    classificationEditingId=next;
    classificationNewIds.delete(classificationKey(classificationKind,previous));
    classificationNewIds.add(classificationKey(classificationKind,next));
    const picker=el('classification-list');
    const option=[...picker.options].find(x=>x.value===previous);
    if(option){option.value=next;option.textContent=item.label+' ('+next+')';picker.value=next;}
    markClassificationDirty();
    return true;
  }
  el('classification-id').addEventListener('input',()=>{
    el('classification-id').removeAttribute('aria-invalid');
    markClassificationDirty();
  });
  el('classification-id').addEventListener('change',()=>{
    // Do not recreate the form on blur: that can reset the displayed text.
    commitClassificationIdentifier();
  });
  el('classification-common').addEventListener('input',()=>{classificationDraft.commonKeywords=classificationWords(el('classification-common').value);markClassificationDirty();});
  el('classification-new').addEventListener('click',()=>{
    const entries=classificationEntries(),max=classificationKind==='areas'?30:20;
    if(entries.length>=max)return status('Maximal '+max+' Einträge zulässig.');
    const prefix=classificationKind==='areas'?'bereich':'art';let index=1;
    while(entries.some(x=>x.id===prefix+'-'+index)||prefix+'-'+index==='unassigned')index++;
    const id=prefix+'-'+index;
    const item={id,label:classificationKind==='areas'?'Neuer Bereich':'Neue Kalenderart',keywords:[]};
    if(classificationKind==='types')entries.splice(entries.findIndex(x=>x.id==='other'),0,item);
    else entries.push(item);
    classificationEditingId=id;classificationNewIds.add(classificationKey(classificationKind,id));markClassificationDirty();renderClassification();el('classification-label').focus();el('classification-label').select();
  });
  el('classification-adopt').addEventListener('click',()=>{
    const code=el('classification-detected-list').value;
    if(!code||configuredAreaForSuffix(code,classificationDraft)||classificationDraft.areas.length>=30)return;
    const id=areaIdentifierFromSuffix(code,classificationDraft.areas);
    // The displayed suffix is an explicit alias; it also works for umlauts.
    classificationDraft.areas.push({id,label:code.toLocaleUpperCase(navigator.language||'de-DE'),keywords:['('+code+')']});
    classificationKind='areas';classificationEditingId=id;markClassificationDirty();renderClassification();
    status('Vorschlag '+code.toLocaleUpperCase(navigator.language||'de-DE')+' als Entwurf übernommen. Mit „Konfiguration speichern“ dauerhaft aktivieren.');
  });
  el('classification-dismiss').addEventListener('click',()=>{
    const code=el('classification-detected-list').value;if(!code)return;
    if(!storeAreaProposals(areaProposalCodes.filter(x=>x!==code)))return status('Vorschlag konnte nicht dauerhaft verworfen werden.');
    renderClassification();status('Vorschlag verworfen. Nur „Vorschläge ermitteln“ kann ihn erneut anzeigen.');
  });
  el('classification-scan').addEventListener('click',()=>{
    const fresh=collectCalendars();
    if(!fresh.length)return status('Keine Kalender für den Suchlauf gefunden.');
    lastAreaScan=discoverAreaProposalReport(fresh,classificationDraft);
    const next=lastAreaScan.codes;
    if(!storeAreaProposals(next))return status('Vorschlagsliste konnte nicht gespeichert werden. Keine Änderung übernommen.');
    renderClassification();
    status(next.length+' neue Bereichsvorschläge · '+lastAreaScan.inspected+' Kalender geprüft · '+lastAreaScan.covered+' bekannte Kürzel. Vorschläge werden nicht automatisch angelegt.');
  });
  el('classification-delete').addEventListener('click',()=>{
    const item=classificationCurrent();if(!item||item.id==='other')return;
    if(!confirm('„'+item.label+'“ aus der Konfiguration entfernen? Verknüpfte Filter werden beim Speichern geprüft.'))return;
    classificationEntries().splice(classificationEntries().indexOf(item),1);
    classificationNewIds.delete(classificationKey(classificationKind,item.id));classificationEditingId='';markClassificationDirty();renderClassification(false);
  });
  for(const [id,step] of [['classification-up',-1],['classification-down',1]])el(id).addEventListener('click',()=>{
    const entries=classificationEntries(),idx=entries.findIndex(x=>x.id===classificationEditingId),other=idx+step;
    if(idx<0||other<0||other>=entries.length||entries[idx].id==='other'||entries[other].id==='other')return;
    [entries[idx],entries[other]]=[entries[other],entries[idx]];markClassificationDirty();renderClassification();
  });
  function applyClassification(next){
    // Compute renames from the editor's *original* object identities. This also
    // handles multiple renames of the same entry before Save.
    const renamed={areas:new Map(),types:new Map()};
    for(const kind of ['areas','types'])for(const entry of next[kind]){
      const original=classificationOrigins.get(entry);
      if(original&&original!==entry.id&&rules[kind].some(x=>x.id===original))
        renamed[kind].set(original,entry.id);
    }
    const remapArea=id=>renamed.areas.get(id)||id;
    const remapType=id=>renamed.types.get(id)||id;
    const replaceReferences=(ids,mapper,allowed)=>[...new Set(ids.map(mapper).filter(id=>allowed.has(id)))];
    const prepared=structuredClone(next);
    // Keep existing '(CODE)' name suffixes recognized after renaming an ID,
    // without adding organization-specific logic or mutating calendar names.
    for(const area of prepared.areas){
      const original=[...renamed.areas].find(([,updated])=>updated===area.id)?.[0];
      if(!original||prepared.areas.some(x=>x.id===original))continue;
      const alias='('+original+')';
      if(!area.keywords.some(x=>norm(x)===norm(alias)||norm(x)===norm(original)) && area.keywords.length<30)
        area.keywords.push(alias);
    }
    if(!validateRules(prepared))return status('Bitte die Konfiguration prüfen: mindestens zwei Suchzeichen (ohne *), Ausschlüsse nur als <Begriff>, maximal 30 gültige Suchmuster pro Eintrag sowie eindeutige Kennungen und Namen. „Sonstige“ muss erhalten bleiben.');
    if(quickDirty&&!confirm('Ungespeicherte Änderungen an der Schnellansicht verwerfen und Bereichsregeln übernehmen?'))return;
    const previousRules=rules,prevAreas=[...allAreas],prevTypes=[...allTypes],previousDefaults=defaultQuickViews;
    const previousQuick=quickViews;
    // Rebuild entirely in memory first; there are no network operations.
    rules=structuredClone(prepared);rebuildClassification();defaultQuickViews=makeDefaultQuickViews();
    const newAreaIds=new Set(allAreas),newTypeIds=new Set(allTypes);
    const removed=[...prevAreas.filter(id=>!newAreaIds.has(remapArea(id))).map(x=>'Bereich '+x),
                   ...prevTypes.filter(id=>!newTypeIds.has(remapType(id))).map(x=>'Art '+x)];
    const oldDefaultIds=new Set(previousDefaults.map(x=>x.id));
    const nextDefaults=new Map(defaultQuickViews.map(x=>[x.id,x]));
    const remapViewId=id=>oldDefaultIds.has(id)&&id.startsWith('area-') ? 'area-'+remapArea(id.slice(5)) : id;
    const remapChoice=value=>typeof value==='string'&&value.startsWith('built:')
      ?'built:'+remapViewId(value.slice(6)):value;
    let views=previousQuick.map(v=>{
      const id=remapViewId(v.id);
      const oldDefault=previousDefaults.find(d=>d.id===v.id);
      const currentDefault=nextDefaults.get(id);
      return {...v,id,
        label:(oldDefault?.label===v.label&&currentDefault)?currentDefault.label:v.label,
        config:{...v.config,areas:replaceReferences(v.config.areas,remapArea,newAreaIds),
               types:replaceReferences(v.config.types,remapType,newTypeIds)}};
    }).filter(v=>!oldDefaultIds.has(v.id)||nextDefaults.has(v.id)||!previousDefaults.some(d=>remapViewId(d.id)===v.id));
    for(const v of defaultQuickViews){if(views.length>=60)break;if(!views.some(x=>x.id===v.id)&&quickGroups.includes(v.group))views.push(structuredClone(v));}
    if(!validQuickViews(views,quickGroups)){
      rules=previousRules;rebuildClassification();defaultQuickViews=previousDefaults;
      return status('Schnellansicht-Kennungen kollidieren nach der Umbenennung. Bitte die vorhandenen Schnellansichten prüfen.');
    }
    if(removed.length&&!confirm('Diese Zuordnungen entfallen: '+removed.join(', ')+'.\nDeren Kennungen werden aus Schnellansichten und Profilfiltern entfernt. Fortfahren?')){
      rules=previousRules;rebuildClassification();defaultQuickViews=previousDefaults;return;
    }
    const migratedProfiles=profiles.map(p=>p.filters?{...p,filters:{...p.filters,
      areas:replaceReferences(p.filters.areas||[],remapArea,newAreaIds),
      types:replaceReferences(p.filters.types||[],remapType,newTypeIds)}}:p);
    const migratedHome=homeArea&&newAreaIds.has(remapArea(homeArea))?remapArea(homeArea):'';
    const oldSelectedAreas=[...selectedAreas],oldSelectedTypes=[...selectedTypes];
    const allPriorAreas=prevAreas.every(x=>selectedAreas.has(x));
    const allPriorTypes=prevTypes.every(x=>selectedTypes.has(x));
    const migratedSelectedAreas=new Set(allPriorAreas?allAreas:replaceReferences(oldSelectedAreas,remapArea,newAreaIds));
    const migratedSelectedTypes=new Set(allPriorTypes?allTypes:replaceReferences(oldSelectedTypes,remapType,newTypeIds));
    const migratedChoice=remapChoice(choice);
    const migratedDraft=structuredClone(draftData());
    migratedDraft.selection.areas=[...migratedSelectedAreas];
    migratedDraft.selection.types=[...migratedSelectedTypes];
    migratedDraft.selection.choice=migratedChoice;
    const saved=writeStorageBatch([
      [rulesKey,prepared],[quickViewsKey,views],[homeAreaKey,migratedHome||null],
      [storageKey,migratedProfiles],[draftKey,migratedDraft]
    ]);
    if(!saved.ok){
      rules=previousRules;rebuildClassification();defaultQuickViews=previousDefaults;
      return status(saved.rolledBack?'Lokales Speichern fehlgeschlagen; Änderungen zurückgenommen.':'Lokales Speichern fehlgeschlagen; Rücknahme unvollständig. Bitte die Sicherung prüfen.');
    }
    lastAreaScan=discoverAreaProposalReport(items,rules);
    quickViews=views;profiles=migratedProfiles;homeArea=migratedHome;
    storeAreaProposals(areaProposalCodes.filter(code=>
      !configuredAreaForSuffix(code,previousRules)&&!configuredAreaForSuffix(code,prepared)));
    selectedAreas=migratedSelectedAreas;selectedTypes=migratedSelectedTypes;choice=migratedChoice;
    if(selectionKind==='criteria')recomputeCriteria();else syncSummaryFromManual();
    classificationDraft=structuredClone(prepared);classificationDirty=false;classificationNewIds.clear();rememberClassificationOrigins();
    classificationEditingId=classificationKind==='areas'?remapArea(classificationEditingId):remapType(classificationEditingId);
    quickEditingId=remapViewId(quickEditingId);
    renderClassification();renderPreferredOptions();buildQuickChecks();quickEditorLoaded=false;quickDirty=false;renderAll();
    const changes=[...renamed.areas].map(([a,b])=>'Bereich '+a+' → '+b)
      .concat([...renamed.types].map(([a,b])=>'Art '+a+' → '+b));
    status((changes.length?changes.join('; ')+'. ':'')+'Bereiche und Kalenderarten gespeichert und sofort übernommen; Referenzen und Profile angepasst. Keine Serveränderung.');
  }
  el('classification-save').addEventListener('click',()=>{
    if(!commitClassificationIdentifier()){el('classification-id').focus();return;}
    applyClassification(classificationDraft);
  });
  el('classification-reset').addEventListener('click',()=>{
    if(!confirm('Bereiche, Kalenderarten und Schlüsselwörter auf Standardwerte zurücksetzen? Gespeicherte Schnellansichten und Profile bleiben erhalten.'))return;
    classificationDraft=structuredClone(defaultRules);classificationKind='areas';classificationEditingId='';classificationNewIds.clear();rememberClassificationOrigins();markClassificationDirty();renderClassification(false);
    status('Standardregeln vorbereitet. Mit „Konfiguration speichern“ übernehmen.');
  });
  el('always-visible-search').addEventListener('input',()=>{el('always-visible-list').scrollTop=0;renderAlwaysVisible();});
  function renderPreferredOptions(){
    const select=el('preferred-area');select.replaceChildren();
    const empty=document.createElement('option');empty.value='';empty.textContent='— Keinen bevorzugten Bereich festlegen —';select.append(empty);
    for(const [code,label] of areas){const option=document.createElement('option');option.value=code;option.textContent=label;select.append(option);}
    select.value=homeArea;
  }
  renderPreferredOptions();
  el('preferred-area').addEventListener('change',event=>{
    const next=event.target.value;
    if(next && !allAreas.includes(next))return;
    try{
      if(next)localStorage.setItem(homeAreaKey,next);else localStorage.removeItem(homeAreaKey);
      homeArea=next;renderSetup();status(next?'Bevorzugter Bereich gespeichert.':'Bevorzugter Bereich zurückgesetzt.');
    }catch(e){event.target.value=homeArea;status('bevorzugter Bereich konnte nicht gespeichert werden.');}
  });
  function switchTab(tab) {
    if(!['profiles','individual','sorting','setup'].includes(tab)) return;
    currentTab=tab;
    shadow.querySelector('.scroll').scrollTop=0;
    panel.classList.toggle('sort-tab',tab==='sorting');
    panel.classList.toggle('setup-tab-active',tab==='setup');
    panel.classList.toggle('individual-tab',tab==='individual');
    shadow.querySelectorAll('[data-tab]').forEach(button=>button.setAttribute('aria-selected',String(button.dataset.tab===tab)));
    shadow.querySelectorAll('[data-panel]').forEach(p=>p.hidden=p.dataset.panel!==tab);
    refreshSetupFooter();
    if(tab==='sorting') renderSort();
    if(tab==='setup') {renderSetup();switchSetupTab(currentSetupTab);}
    if(previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame=requestAnimationFrame(previewSizing);
  }

  function renderPresetList() {
    for (const id of ['presets','presets-individual']) {
      const select=el(id);select.replaceChildren();
      const manual=document.createElement('option');
      manual.value='criteria';manual.textContent='— Individuelle Filterauswahl —';select.appendChild(manual);
      for(const section of quickGroups){
        const views=quickViews.filter(x=>x.group===section&&x.visible);
        if(!views.length)continue;
        const group=document.createElement('optgroup');group.label=section;
        for(const view of views){
          const option=document.createElement('option');option.value='built:'+view.id;
          const count=presetCount(view.id);option.textContent=view.label+' ('+count+')'+(!count?' · nicht verfügbar':'');
          option.disabled=!count;option.title=count?count+' passende Kalender':'Keine passenden Kalender in der aktuellen Liste';
          group.appendChild(option);
        }
        select.appendChild(group);
      }
      select.value=choice.startsWith('built:')&&quickViews.some(x=>x.visible&&'built:'+x.id===choice)?choice:'criteria';
      select.disabled=busy;
    }
    for (const id of ['saved-profiles','saved-profiles-individual']) {
      const picker=el(id);picker.replaceChildren();
      const blank=document.createElement('option');blank.value='';blank.textContent='— Profil auswählen —';picker.appendChild(blank);
      for (const profile of profiles) {
        const option=document.createElement('option');option.value=profile.id;
        option.textContent=profile.label+(profile.filters?' · Filter':' · Einzelauswahl');picker.appendChild(option);
      }
      picker.value=choice.startsWith('saved:')?choice.slice(6):'';
      picker.disabled=busy;
    }
  }
  const collation = new Intl.Collator(navigator.language||'de-DE', { numeric:true, sensitivity:'base' });
  const typePriority=allTypes;
  const sourcePriority = ['personal','shared','deck','tasks','unknown'];
  function sortedItems(mode = sortMode) {
    // Stability is intentional: active/selected sorts preserve the existing
    // relative order within each group, including manually reordered entries.
    const base=sortPlanItems();
    const originalPositions=new Map(base.map((x,i)=>[x.key,i]));
    const sourceRank=x=>sourcePriority.indexOf(x.source);
    const communityRank=x=>{const code=areaOf(x.name);if(homeArea&&code===homeArea)return -1;const i=allAreas.indexOf(code);return i<0?99:i;};
    const categoryRank=x=>{const i=typePriority.indexOf(typeOf(x.name));return i<0?99:i;};
    return [...base].sort((a,b)=>{
      const group=sourceRank(a)-sourceRank(b);
      if(group)return group;
      if(mode==='original')return items.indexOf(a)-items.indexOf(b);
      if(mode==='active')return Number(isEnabled(b))-Number(isEnabled(a))||originalPositions.get(a.key)-originalPositions.get(b.key);
      if(mode==='selected')return Number(selected.has(b.key))-Number(selected.has(a.key))||originalPositions.get(a.key)-originalPositions.get(b.key);
      if(mode==='home')return Number(areaOf(b.name)===homeArea)-Number(areaOf(a.name)===homeArea)||originalPositions.get(a.key)-originalPositions.get(b.key);
      if(mode==='alphabet')return collation.compare(a.name,b.name)||originalPositions.get(a.key)-originalPositions.get(b.key);
      const orderA=mode==='category'?[categoryRank(a),communityRank(a)]:[communityRank(a),categoryRank(a)];
      const orderB=mode==='category'?[categoryRank(b),communityRank(b)]:[communityRank(b),categoryRank(b)];
      for(let i=0;i<orderA.length;i++)if(orderA[i]!==orderB[i])return orderA[i]-orderB[i];
      return collation.compare(a.name,b.name)||originalPositions.get(a.key)-originalPositions.get(b.key);
    });
  }
  let davProbe=null;
  const sortBackupKey=storageKey+':last-calendars-order';
  function getSortBackup(){
    try{const v=JSON.parse(localStorage.getItem(sortBackupKey)||'null');return v?.version===1&&Array.isArray(v.entries)?v:null;}
    catch(e){return null;}
  }

  function sortPlanItems() {
    const position=new Map(sortPlan.map((key,index)=>[key,index]));
    const group=x=>sourcePriority.indexOf(x.source);
    return [...items].sort((a,b)=>group(a)-group(b)||
      (position.has(a.key)?position.get(a.key):items.indexOf(a)+items.length)-
      (position.has(b.key)?position.get(b.key):items.indexOf(b)+items.length));
  }
  function replan(proposal) {
    const before=sortPlanItems(), next=[];
    for(const source of sourcePriority){
      const oldRows=before.filter(x=>x.source===source);
      const fixed=new Map(oldRows.map((x,i)=>[i,x]).filter(([i,x])=>sortPinned.has(x.key)));
      const candidates=proposal.filter(x=>x.source===source&&!sortPinned.has(x.key));
      let nextIndex=0;
      for(let i=0;i<oldRows.length;i++) next.push((fixed.get(i)||candidates[nextIndex++]).key);
    }
    sortPlan=next;
    currentSortSet='';
    commitSort();
  }
  function moveSort(key,targetKey) {
    const ordered=sortPlanItems();
    const from=ordered.findIndex(x=>x.key===key),to=ordered.findIndex(x=>x.key===targetKey);
    if(from<0||to<0||from===to||ordered[from].source!==ordered[to].source||sortPinned.has(key)||sortPinned.has(targetKey))return;
    // A pinned calendar retains its slot while other unpinned items move around it.
    const slots=ordered.map((x,i)=>!sortPinned.has(x.key)?i:-1).filter(x=>x>=0);
    const movable=slots.map(i=>ordered[i]);
    const a=movable.findIndex(x=>x.key===key),b=movable.findIndex(x=>x.key===targetKey);
    const [entry]=movable.splice(a,1);movable.splice(b,0,entry);
    slots.forEach((slot,i)=>{ordered[slot]=movable[i];});
    sortPlan=ordered.map(x=>x.key);
    sortMode='manual';el('sort-mode').value='manual';currentSortSet='';
    commitSort();
  }
  function moveSortStep(key,shift) {
    const item=sortPlanItems().find(x=>x.key===key);
    if(!item||sortPinned.has(key))return;
    const neighbors=sortPlanItems().filter(x=>x.source===item.source&&!sortPinned.has(x.key));
    const pos=neighbors.findIndex(x=>x.key===key);
    if(pos+shift<0||pos+shift>=neighbors.length)return;
    moveSort(key,neighbors[pos+shift].key);
  }
  function draftData(){
    return {selection:{kind:selectionKind,choice,keys:[...selected],areas:[...selectedAreas],types:[...selectedTypes],extras:{deck:includeDeck,tasks:includeTasks,personal:includePersonal,shared:includeShared,common:includeCommon}},sorting:{mode:sortMode,keys:[...sortPlan],pinned:[...sortPinned]}};
  }
  function persistDraft(){try{localStorage.setItem(draftKey,JSON.stringify(draftData()));}catch(e){}}
  function restoreDraft(){
    let data;try{data=JSON.parse(localStorage.getItem(draftKey)||'null');}catch(e){return false;}
    if(!data||!data.selection||!data.sorting)return false;
    const sl=data.selection,so=data.sorting;
    if(!Array.isArray(sl.keys)||!Array.isArray(sl.areas)||!Array.isArray(sl.types)||!Array.isArray(so.keys)||!Array.isArray(so.pinned))return false;
    const available=new Set(items.map(x=>x.key));
    selected=new Set(sl.keys.filter(x=>available.has(x)));
    selectedAreas=new Set(sl.areas.filter(x=>allAreas.includes(x)));
    selectedTypes=new Set(sl.types.filter(x=>allTypes.includes(x)));
    includeDeck=sl.extras?.deck===true;includeTasks=sl.extras?.tasks===true;includePersonal=sl.extras?.personal===true;includeShared=sl.extras?.shared===true;includeCommon=sl.extras?.common===true;
    selectionKind=sl.kind==='criteria'?'criteria':'manual';
    const c=typeof sl.choice==='string'?sl.choice:'';
    choice=(c==='criteria'||(c.startsWith('built:')&&presetConfig(c.slice(6)))||(c.startsWith('saved:')&&profiles.some(p=>p.id===c.slice(6))))?c:'manual';
    if(selectionKind==='criteria')recomputeCriteria();
    sortPlan=[...so.keys.filter(x=>available.has(x)),...items.map(x=>x.key).filter(x=>!so.keys.includes(x))];
    sortPinned=new Set(so.pinned.filter(x=>available.has(x)));
    const modes=['manual','original','active','selected','home','community','category','alphabet'];
    sortMode=modes.includes(so.mode)?so.mode:'manual';
    if(sortMode==='home'&&!homeArea)sortMode='manual';
    el('sort-mode').value=sortMode;
    return true;
  }
  function renderSortSets() {
    const select=el('sort-sets');select.replaceChildren();
    const blank=document.createElement('option');blank.value='';blank.textContent='— Sortier-Set auswählen —';select.appendChild(blank);
    for(const entry of sortSets){const option=document.createElement('option');option.value=entry.id;option.textContent=entry.label;select.appendChild(option);}
    select.value=currentSortSet;
  }
  // The 2.0.1 setup editor never modifies the active selection or server order.
  // Both stored record types share one isolated editing draft and persistence path.
  const savedRecords=kind=>kind==='sorting'?sortSets:profiles;
  const saveRecords=kind=>kind==='sorting'?persistSortSets():persist();
  const managerExtraFields=[['includeCommon','Allgemeine Kalender','common'],['includePersonal','Eigene Kalender','personal'],['includeShared','Geteilte Kalender','shared'],['includeDeck','Deck','deck'],['includeTasks','Aufgaben','tasks']];
  const managerQuick={areas:new Set(),types:new Set(),extras:new Set()};
  let managerDraft=null,managerDragKey=null;
  function managerDefaultFilters(){
    return {areas:[],types:[],includeCommon:false,includePersonal:false,includeShared:false,includeDeck:false,includeTasks:false};
  }
  function managerCloneEntry(entry,kind){
    const result={kind,id:entry.id||null,label:entry.label||'',keys:[...entry.keys],pinned:[...(entry.pinned||[])],filters:entry.filters?structuredClone(entry.filters):null};
    return result;
  }
  function managerCompareValue(draft){return JSON.stringify({label:draft.label,keys:draft.keys,pinned:draft.pinned,filters:draft.filters});}
  function managerDirty(){return !!managerDraft&&(managerDraft.isNew||managerCompareValue(managerDraft)!==managerDraft.original);}
  function managerMayDiscard(){return !managerDirty()||confirm('Ungespeicherte Änderungen im Editor verwerfen?');}
  function managerClearQuick(){
    for(const s of Object.values(managerQuick))s.clear();
    el('saved-manager-search').value='';
  }
  function managerLoad(kind,id){
    const entry=savedRecords(kind).find(e=>e.id===id);
    managerDraft=entry?{...managerCloneEntry(entry,kind),isNew:false,original:managerCompareValue(managerCloneEntry(entry,kind))}:null;
    managerClearQuick();
  }
  function managerCalendarRows(){
    const draft=managerDraft;
    if(!draft)return [];
    const position=new Map(draft.keys.map((key,index)=>[key,index]));
    if(draft.kind!=='sorting')return [...items];
    return [...items].sort((a,b)=>sourcePriority.indexOf(a.source)-sourcePriority.indexOf(b.source)||
      (position.has(a.key)?position.get(a.key):items.length+items.indexOf(a))-
      (position.has(b.key)?position.get(b.key):items.length+items.indexOf(b)));
  }
  function managerVisibleRows(){
    const query=norm(cleanName(el('saved-manager-search').value));
    return managerCalendarRows().filter(item=>(!query||norm(item.name).includes(query))&&
      (!managerQuick.areas.size||(item.source!=='deck'&&item.source!=='tasks'&&managerQuick.areas.has(areaOf(item.name))))&&
      (!managerQuick.types.size||(item.source!=='deck'&&item.source!=='tasks'&&managerQuick.types.has(typeOf(item.name))))&&
      (!managerQuick.extras.size||[...managerQuick.extras].some(id=>matchesIndividualExtra(item,id))));
  }
  function managerRenderQuick(){
    const options={areas,types,extras:individualExtraOptions};
    for(const [kind,title] of [['areas','Bereiche'],['types','Kalenderarten'],['extras','Weitere Kalender']]){
      const target=el('saved-manager-filter-'+kind),selectedFilter=managerQuick[kind];
      target.replaceChildren();
      for(const [id,label] of options[kind]){
        const wrapper=document.createElement('label');wrapper.className='individual-filter-option';
        const cb=document.createElement('input');cb.type='checkbox';cb.checked=selectedFilter.has(id);cb.disabled=busy;
        const name=document.createElement('span');name.textContent=label;
        wrapper.append(cb,name);target.appendChild(wrapper);
        cb.addEventListener('change',()=>{
          if(cb.checked)selectedFilter.add(id);else selectedFilter.delete(id);
          el('saved-manager-'+kind+'-title').textContent=title+(selectedFilter.size?' ('+selectedFilter.size+')':'');
          managerRenderCalendarList();
        });
      }
      el('saved-manager-'+kind+'-title').textContent=title+(selectedFilter.size?' ('+selectedFilter.size+')':'');
    }
    el('saved-manager-filters-reset').disabled=busy||(!el('saved-manager-search').value&&!Object.values(managerQuick).some(s=>s.size));
  }
  function managerRecomputeProfileKeys(){
    const d=managerDraft;
    if(!d||d.kind!=='profiles'||!d.filters)return;
    const f=d.filters;
    const cfg={areas:f.areas,types:f.types,common:f.includeCommon,personal:f.includePersonal,shared:f.includeShared,deck:f.includeDeck,tasks:f.includeTasks};
    d.keys=items.filter(x=>matchesConfig(x,cfg)).map(x=>x.key);
  }
  function managerRenderCriteria(){
    const d=managerDraft;
    const isProfile=!!d&&d.kind==='profiles';
    el('saved-manager-profile-settings').hidden=!isProfile;
    el('saved-manager-mode').value=d?.filters?'criteria':'fixed';
    el('saved-manager-criteria').hidden=!isProfile||!d.filters;
    if(!isProfile||!d.filters)return;
    for(const [field,options] of [['areas',areas],['types',types]]){
      const target=el('saved-manager-criteria-'+field);target.replaceChildren();
      for(const [id,label] of options){
        const wrapper=document.createElement('label');wrapper.className='check';
        const cb=document.createElement('input');cb.type='checkbox';cb.checked=d.filters[field].includes(id);cb.disabled=busy;
        const txt=document.createElement('span');txt.textContent=label;wrapper.append(cb,txt);target.appendChild(wrapper);
        cb.addEventListener('change',()=>{
          const values=new Set(d.filters[field]);if(cb.checked)values.add(id);else values.delete(id);
          d.filters[field]=[...values];managerRecomputeProfileKeys();managerRenderCalendarList();
        });
      }
    }
    const extras=el('saved-manager-criteria-extras');extras.replaceChildren();
    for(const [field,label] of managerExtraFields){
      const wrapper=document.createElement('label');wrapper.className='check';
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=!!d.filters[field];cb.disabled=busy;
      const txt=document.createElement('span');txt.textContent=label;wrapper.append(cb,txt);extras.appendChild(wrapper);
      cb.addEventListener('change',()=>{d.filters[field]=cb.checked;managerRecomputeProfileKeys();managerRenderCalendarList();});
    }
  }
  function managerMoveSort(sourceKey,targetKey){
    const d=managerDraft;if(!d||d.kind!=='sorting')return;
    const rows=managerCalendarRows().filter(x=>x.key&&!x.ambiguous);
    const from=rows.find(x=>x.key===sourceKey),to=rows.find(x=>x.key===targetKey);
    if(!from||!to||from.source!==to.source||d.pinned.includes(sourceKey)||d.pinned.includes(targetKey))return;
    const slots=rows.map((item,index)=>!d.pinned.includes(item.key)?index:-1).filter(i=>i>=0);
    const mobile=slots.map(i=>rows[i]);
    const i=mobile.findIndex(x=>x.key===sourceKey),j=mobile.findIndex(x=>x.key===targetKey);
    if(i===-1||j===-1||i===j)return;
    const [moved]=mobile.splice(i,1);mobile.splice(j,0,moved);
    slots.forEach((position,index)=>{rows[position]=mobile[index];});
    // Keep obsolete calendar keys in the saved record; do not silently discard them.
    const live=new Set(rows.map(x=>x.key));
    d.keys=[...rows.map(x=>x.key),...d.keys.filter(k=>!live.has(k))];
    managerRenderCalendarList();
  }
  function managerRenderCalendarList(){
    const d=managerDraft,list=el('saved-manager-calendar-list');list.replaceChildren();
    const toggle=el('saved-manager-toggle-visible');
    if(!d){
      list.textContent='Bitte einen Eintrag auswählen oder über „+ Neu“ anlegen.';
      el('saved-manager-coverage').textContent='';el('saved-manager-missing').textContent='';toggle.hidden=true;
      managerRenderQuick();return;
    }
    const rows=managerVisibleRows(),known=new Set(items.map(x=>x.key));
    let currentSource='';
    for(const item of rows){
      if(d.kind==='sorting'){
        if(item.source!==currentSource){currentSource=item.source;const section=document.createElement('div');section.className='sort-group';section.textContent=sourceLabel[currentSource]||currentSource;list.appendChild(section);}
        const row=document.createElement('div');row.className='sort-row';
        const pin=document.createElement('button');pin.className='sort-btn';pin.type='button';pin.textContent=d.pinned.includes(item.key)?'🔒':'🔓';pin.disabled=busy||item.ambiguous;pin.title='Positionsfixierung umschalten';
        pin.addEventListener('click',()=>{
          const p=new Set(d.pinned);if(p.has(item.key))p.delete(item.key);else p.add(item.key);
          d.pinned=[...p];managerRenderCalendarList();
        });
        const label=document.createElement('span');label.className='sort-label';label.textContent=item.name;
        const up=document.createElement('button');up.className='sort-btn';up.textContent='↑';up.title='Innerhalb der Kalendergruppe nach oben';
        const down=document.createElement('button');down.className='sort-btn';down.textContent='↓';down.title='Innerhalb der Kalendergruppe nach unten';
        const movable=managerCalendarRows().filter(x=>x.source===item.source&&!d.pinned.includes(x.key)&&!x.ambiguous);
        const i=movable.findIndex(x=>x.key===item.key),locked=d.pinned.includes(item.key)||item.ambiguous;
        up.disabled=busy||locked||i<=0;down.disabled=busy||locked||i===-1||i===movable.length-1;
        up.addEventListener('click',()=>managerMoveSort(item.key,movable[i-1]?.key));
        down.addEventListener('click',()=>managerMoveSort(item.key,movable[i+1]?.key));
        row.draggable=!locked&&!busy;
        row.addEventListener('dragstart',event=>{if(locked)return event.preventDefault();managerDragKey=item.key;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item.key);});
        row.addEventListener('dragover',event=>{if(managerDragKey&&managerDragKey!==item.key&&!locked){event.preventDefault();}});
        row.addEventListener('drop',event=>{event.preventDefault();managerMoveSort(managerDragKey,item.key);managerDragKey=null;});
        row.addEventListener('dragend',()=>{managerDragKey=null;});
        row.append(pin,label,up,down);list.appendChild(row);
      }else{
        const wrapper=document.createElement('label');wrapper.className='item';
        const cb=document.createElement('input');cb.type='checkbox';cb.checked=d.keys.includes(item.key);cb.disabled=busy||item.ambiguous||!!d.filters;
        const label=document.createElement('span');label.className='item-name';label.textContent=item.name;
        wrapper.append(cb,label);list.appendChild(wrapper);
        cb.addEventListener('change',()=>{
          const keys=new Set(d.keys);if(cb.checked)keys.add(item.key);else keys.delete(item.key);
          d.keys=[...keys];managerRenderCalendarList();
        });
      }
    }
    if(!rows.length){const hint=document.createElement('p');hint.className='hint';hint.textContent='Keine Kalender für diese Suche und Filter.';list.appendChild(hint);}
    const missing=d.keys.filter(key=>!known.has(key));
    el('saved-manager-missing').textContent=missing.length?missing.length+' gespeicherte Kalender zurzeit nicht gefunden; ihre Zuordnung bleibt erhalten.':'';
    const selectedCount=d.keys.filter(key=>known.has(key)).length;
    el('saved-manager-coverage').textContent=d.kind==='sorting'
      ?d.keys.length+' Kalender in der Sortierung · '+d.pinned.length+' fixiert · '+rows.length+' Treffer'
      :selectedCount+' von '+items.filter(x=>!x.ambiguous).length+' zugeordnet · '+rows.length+' Treffer';
    const available=rows.filter(x=>x.key&&!x.ambiguous);
    const allChecked=available.length>0&&available.every(x=>d.keys.includes(x.key));
    toggle.hidden=d.kind==='sorting'||!!d.filters;
    toggle.disabled=busy||!available.length;
    toggle.textContent=allChecked?'Alle angezeigten abwählen':'Alle angezeigten auswählen';
    managerRenderQuick();
  }
  function renderSavedManager(selectId){
    const kind=el('saved-manager-kind').value,entries=savedRecords(kind),list=el('saved-manager-list');
    if(managerDraft?.kind!==kind)managerDraft=null;
    if(selectId!==undefined){
      if(!managerDraft||managerDraft.id!==selectId)managerLoad(kind,selectId||entries[0]?.id||'');
    }else if(!managerDraft){
      managerLoad(kind,entries[0]?.id||'');
    }
    list.replaceChildren();
    for(const entry of entries){const opt=document.createElement('option');opt.value=entry.id;opt.textContent=entry.label;list.appendChild(opt);}
    list.value=managerDraft?.id||'';
    const entry=entries.find(x=>x.id===managerDraft?.id);
    el('saved-manager-name').value=managerDraft?.label||'';
    el('saved-manager-name').disabled=!managerDraft||busy;
    el('saved-manager-up').disabled=busy||!entry||entries.indexOf(entry)===0;
    el('saved-manager-down').disabled=busy||!entry||entries.indexOf(entry)===entries.length-1;
    el('saved-manager-delete').disabled=busy||!entry;
    el('saved-manager-duplicate').disabled=busy||!entry;
    el('saved-manager-new').disabled=busy;
    el('saved-manager-rename').disabled=busy||!managerDraft;
    el('saved-manager-discard').disabled=busy||!managerDraft;
    el('saved-manager-detail').textContent=managerDraft?
      (managerDraft.isNew?'Neuer Eintrag – noch nicht gespeichert. ':'')+(kind==='sorting'?'Sortierreihenfolge und Fixierungen bearbeiten.':'Kalenderzuordnungen oder Filter bearbeiten.'):
      'Noch keine '+(kind==='sorting'?'Sortier-Sets':'Kalenderprofile')+' gespeichert.';
    managerRenderCriteria();managerRenderCalendarList();
  }
  function managerUniqueLabel(kind,name){
    const labels=new Set(savedRecords(kind).map(x=>norm(x.label)));
    if(!labels.has(norm(name)))return name;
    for(let i=2;i<1000;i++)if(!labels.has(norm(name+' '+i)))return name+' '+i;
    return name+' '+Date.now();
  }
  function managerStartNew(duplicate=false){
    if(busy||!managerMayDiscard())return;
    const kind=el('saved-manager-kind').value,old=duplicate?managerDraft:null;
    if(duplicate&&!old?.id)return;
    managerDraft=old?managerCloneEntry(old,kind):{
      kind,id:null,label:'',keys:kind==='sorting'?sortPlanItems().map(x=>x.key):[],pinned:kind==='sorting'?[...sortPinned]:[],filters:null
    };
    managerDraft.id=null;managerDraft.isNew=true;
    managerDraft.label=old?managerUniqueLabel(kind,old.label+' (Kopie)'):'';
    managerDraft.original='';managerClearQuick();renderSavedManager();
    el('saved-manager-name').focus();
  }
  function managerSave(){
    if(busy||!managerDraft)return;
    const d=managerDraft,kind=d.kind,existing=savedRecords(kind),name=cleanName(el('saved-manager-name').value);
    if(!name||name.length>60)return status('Name muss 1 bis 60 Zeichen enthalten.');
    if(existing.some(x=>x.id!==d.id&&norm(x.label)===norm(name)))return status('Name ist bereits vergeben.');
    if(d.isNew&&existing.length>=(kind==='sorting'?50:80))return status('Maximalzahl gespeicherter Einträge erreicht.');
    if(kind==='profiles'&&d.filters)managerRecomputeProfileKeys();
    const id=d.id||Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8);
    const value=kind==='sorting'?{id,label:name,keys:[...d.keys],pinned:[...d.pinned]}:
      {id,label:name,keys:[...d.keys],...(d.filters?{filters:structuredClone(d.filters)}:{})};
    const updated=d.isNew?[...existing,value]:existing.map(x=>x.id===id?value:x);
    if(kind==='sorting')sortSets=updated;else profiles=updated;
    if(!saveRecords(kind)){
      if(kind==='sorting')sortSets=existing;else profiles=existing;
      return status('Eintrag konnte nicht gespeichert werden.');
    }
    managerLoad(kind,id);renderAll();renderSavedManager(id);
    status((kind==='sorting'?'Sortier-Set':'Kalenderprofil')+' „'+name+'“ gespeichert. Die aktive Kalenderansicht wurde nicht verändert.');
  }
  function changeSavedManager(action){
    if(busy)return;
    if(action==='rename'){managerSave();return;}
    const kind=el('saved-manager-kind').value,old=savedRecords(kind),id=managerDraft?.id;
    const index=old.findIndex(x=>x.id===id);if(index<0||!managerMayDiscard())return;
    const next=old.map(x=>structuredClone(x));let focus=id;
    if(action==='delete'){
      if(!confirm((kind==='sorting'?'Sortier-Set':'Kalenderprofil')+' „'+next[index].label+'“ endgültig löschen?'))return;
      next.splice(index,1);focus=next[Math.min(index,next.length-1)]?.id||'';
    }else{
      const target=index+(action==='up'?-1:1);if(target<0||target>=next.length)return;
      [next[index],next[target]]=[next[target],next[index]];
    }
    if(kind==='sorting')sortSets=next;else profiles=next;
    if(!saveRecords(kind)){
      if(kind==='sorting')sortSets=old;else profiles=old;
      return status('Änderung konnte nicht gespeichert werden.');
    }
    if(action==='delete'){
      if(kind==='sorting'&&currentSortSet===id)currentSortSet='';
      if(kind==='profiles'&&choice==='saved:'+id){choice='manual';selectionKind='manual';syncSummaryFromManual();persistDraft();}
    }
    managerDraft=null;renderSavedManager(focus);renderAll();
    status((kind==='sorting'?'Sortier-Set':'Kalenderprofil')+(action==='delete'?' gelöscht.':' in der Liste verschoben.'));
  }
  el('saved-manager-kind').addEventListener('change',event=>{
    if(!managerMayDiscard()){el('saved-manager-kind').value=managerDraft?.kind||'profiles';return;}
    managerDraft=null;managerClearQuick();renderSavedManager('');
  });
  el('saved-manager-list').addEventListener('change',event=>{
    if(!managerMayDiscard()){el('saved-manager-list').value=managerDraft?.id||'';return;}
    managerLoad(el('saved-manager-kind').value,event.target.value);renderSavedManager();
  });
  el('saved-manager-name').addEventListener('input',event=>{if(managerDraft)managerDraft.label=event.target.value;});
  el('saved-manager-mode').addEventListener('change',event=>{
    if(!managerDraft||managerDraft.kind!=='profiles')return;
    managerDraft.filters=event.target.value==='criteria'?managerDefaultFilters():null;
    if(managerDraft.filters)managerRecomputeProfileKeys();
    managerRenderCriteria();managerRenderCalendarList();
  });
  el('saved-manager-search').addEventListener('input',managerRenderCalendarList);
  el('saved-manager-filters-reset').addEventListener('click',()=>{managerClearQuick();managerRenderCalendarList();});
  el('saved-manager-toggle-visible').addEventListener('click',()=>{
    const d=managerDraft;if(!d||d.kind!=='profiles'||d.filters)return;
    const shown=managerVisibleRows().filter(x=>x.key&&!x.ambiguous),keys=new Set(d.keys);
    if(shown.every(x=>keys.has(x.key)))shown.forEach(x=>keys.delete(x.key));
    else shown.forEach(x=>keys.add(x.key));
    d.keys=[...keys];managerRenderCalendarList();
  });
  el('saved-manager-new').addEventListener('click',()=>managerStartNew(false));
  el('saved-manager-duplicate').addEventListener('click',()=>managerStartNew(true));
  el('saved-manager-discard').addEventListener('click',()=>{
    if(!managerMayDiscard())return;
    const id=managerDraft?.id||'';managerDraft=null;managerClearQuick();renderSavedManager(id);
  });
  for(const action of ['rename','delete','up','down'])el('saved-manager-'+action).addEventListener('click',()=>changeSavedManager(action));

  function renderSort() {
    const list=el('sort-preview'),oldScroll=list.scrollTop;list.replaceChildren();
    let section='',index=0;
    const rows=sortPlanItems();
    for(const item of rows){
      if(item.source!==section){section=item.source;const head=document.createElement('div');head.className='sort-group';head.textContent=sourceLabel[section]||section;list.appendChild(head);}
      index++;
      const row=document.createElement('div');row.className='sort-row';row.dataset.key=item.key;
      const locked=sortPinned.has(item.key);row.classList.toggle('pinned',locked);row.draggable=!locked&&!busy&&!item.ambiguous;
      const num=document.createElement('span');num.className='sort-num';num.textContent=index+'.';
      const label=document.createElement('span');label.className='sort-label';label.textContent=item.name+(item.ambiguous?' · nicht eindeutig':'');
      if(selected.has(item.key))label.classList.add('sort-picked');
      const pin=document.createElement('button');pin.className='sort-btn';pin.textContent=locked?'🔒':'🔓';pin.title=locked?'Position freigeben':'Position fixieren';pin.setAttribute('aria-label',pin.title);pin.disabled=busy||item.ambiguous;
      pin.addEventListener('click',()=>{if(locked)sortPinned.delete(item.key);else sortPinned.add(item.key);currentSortSet='';commitSort();});
      const up=document.createElement('button');up.className='sort-btn';up.textContent='↑';up.title='Eine freie Position nach oben';
      const down=document.createElement('button');down.className='sort-btn';down.textContent='↓';down.title='Eine freie Position nach unten';
      const freeRows=rows.filter(x=>x.source===item.source&&!sortPinned.has(x.key));
      const freeIndex=freeRows.findIndex(x=>x.key===item.key);
      up.disabled=busy||locked||item.ambiguous||freeIndex<=0;
      down.disabled=busy||locked||item.ambiguous||freeIndex<0||freeIndex===freeRows.length-1;
      up.addEventListener('click',()=>moveSortStep(item.key,-1));
      down.addEventListener('click',()=>moveSortStep(item.key,1));
      row.addEventListener('dragstart',event=>{if(locked||busy){event.preventDefault();return;}dragSortKey=item.key;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',item.key);});
      row.addEventListener('dragover',event=>{if(!dragSortKey||dragSortKey===item.key||locked||busy)return;
        if(rows.find(x=>x.key===dragSortKey)?.source!==item.source)return;
        event.preventDefault();row.classList.add('dragover');});
      row.addEventListener('dragleave',()=>row.classList.remove('dragover'));
      row.addEventListener('drop',event=>{event.preventDefault();row.classList.remove('dragover');if(dragSortKey)moveSort(dragSortKey,item.key);dragSortKey=null;});
      row.addEventListener('dragend',()=>{dragSortKey=null;row.classList.remove('dragover');});
      row.append(num,label,pin,up,down);list.appendChild(row);
    }
    list.scrollTop=oldScroll;
    el('sort-hint').textContent=davProbe?.valid
      ? `CalDAV geprüft: ${davProbe.mapped.length} Kalender. ${sortPinned.size} Positionen fixiert.`
      : `${sortPinned.size} Positionen fixiert · CalDAV vor der Übernahme lesen. Änderungen an dieser Liste sind zunächst lokal.`;
    const alwaysForSorting=items.filter(x=>!x.ambiguous&&x.key&&alwaysVisibleKeys.has(x.key));
    const allAlwaysPinned=alwaysForSorting.length>0&&alwaysForSorting.every(x=>sortPinned.has(x.key));
    const pinAlwaysButton=el('sort-pin-always');
    pinAlwaysButton.disabled=busy||!alwaysForSorting.length;
    pinAlwaysButton.textContent=allAlwaysPinned?'Immer angezeigte freigeben':'Immer angezeigte fixieren';
    pinAlwaysButton.title=allAlwaysPinned?'Positionsfixierung dieser Kalender aufheben':'Alle immer angezeigten Kalender an ihren derzeitigen Positionen fixieren';
    pinAlwaysButton.setAttribute('aria-pressed',String(allAlwaysPinned));
    el('sort-apply').disabled=busy||!davProbe?.valid;
    el('sort-restore').disabled=busy||!getSortBackup();
    el('sort-refresh-page').hidden=!sortReloadRequired;
    renderSortSets();
  }
  // Ephemeral list-view filters: these never modify the selected calendar keys.
  const individualFilters={areas:new Set(),types:new Set(),extras:new Set()};
  const individualExtraOptions=[['common','Allgemeine Kalender'],['personal','Eigene Kalender'],['shared','Geteilte Kalender'],['deck','Deck'],['tasks','Aufgaben']];
  function matchesIndividualExtra(item,id){
    return id==='common'?commonName(item.name):item.source===id;
  }
  function matchesIndividualFilters(item){
    if(individualFilters.areas.size && ((item.source==='deck'||item.source==='tasks')||!individualFilters.areas.has(areaOf(item.name))))return false;
    if(individualFilters.types.size && ((item.source==='deck'||item.source==='tasks')||!individualFilters.types.has(typeOf(item.name))))return false;
    if(individualFilters.extras.size && ![...individualFilters.extras].some(id=>matchesIndividualExtra(item,id)))return false;
    return true;
  }
  function updateIndividualFilterHeadings(){
    for(const [kind,title] of [['areas','Bereiche'],['types','Kalenderarten'],['extras','Weitere Kalender']]){
      const n=individualFilters[kind].size;
      el('individual-'+kind+'-title').textContent=title+(n?' ('+n+')':'');
      el('individual-'+kind+'-reset').disabled=!n;
      shadow.querySelector('[data-quick-filter="'+kind+'"]').classList.toggle('active',n>0);
    }
    el('individual-filters-reset').disabled=![...Object.values(individualFilters)].some(s=>s.size)&&!el('search').value;
  }
  function renderIndividualFilters(){
    const actionable=items.filter(x=>!x.ambiguous);
    const options={areas,types,extras:individualExtraOptions};
    for(const kind of ['areas','types','extras']){
      const current=individualFilters[kind];
      const entries=options[kind];
      const valid=new Set(entries.map(([id])=>id));
      for(const id of current)if(!valid.has(id))current.delete(id);
      const target=el('individual-'+kind+'-options');target.replaceChildren();
      for(const [id,title] of entries){
        const total=actionable.filter(item=>kind==='extras'?matchesIndividualExtra(item,id):
          item.source!=='deck'&&item.source!=='tasks'&&(kind==='areas'?areaOf(item.name)===id:typeOf(item.name)===id)).length;
        const label=document.createElement('label');label.className='individual-filter-option';
        const check=document.createElement('input');check.type='checkbox';check.checked=current.has(id);check.disabled=busy;
        check.setAttribute('aria-label',title);
        const name=document.createElement('span');name.textContent=title;
        const count=document.createElement('small');count.textContent=String(total);
        label.append(check,name,count);target.appendChild(label);
        check.addEventListener('change',()=>{
          if(check.checked)current.add(id);else current.delete(id);
          updateIndividualFilterHeadings();renderList();
        });
      }
    }
    updateIndividualFilterHeadings();
  }
  // Single source for list rendering and for both actions under the list.
  // An ambiguous calendar can appear in the list but is never changed.
  function visibleIndividualItems(){
    const text=norm(cleanName(el('search').value));
    return items.filter(item=>(!text||norm(item.name).includes(text))&&matchesIndividualFilters(item));
  }
  function renderIndividualActions(visible){
    const actionable=visible.filter(item=>!item.ambiguous&&item.key);
    const fixed=actionable.filter(item=>alwaysVisibleKeys.has(item.key)&&!temporarilyReleasedKeys.has(item.key));
    const togglable=actionable.filter(item=>!isAlwaysVisible(item.key));
    const allSelected=!!togglable.length&&togglable.every(item=>selected.has(item.key));
    const release=el('individual-release-fixed');
    release.disabled=busy||!fixed.length;
    release.textContent='Fixierung lösen'+(fixed.length?' ('+fixed.length+')':'');
    const toggle=el('individual-toggle-visible');
    toggle.disabled=busy||!togglable.length;
    toggle.textContent=allSelected?'Alle angezeigten abwählen':'Alle angezeigten auswählen';
    toggle.setAttribute('aria-pressed',String(allSelected));
    el('individual-list-note').textContent=fixed.length
      ? fixed.length+' angezeigte Kalender im Setup fixiert. „Fixierung lösen“ setzt den Schutz nur bis zum Schließen des Bookmarklets aus; die Setup-Einstellungen bleiben erhalten.'
      : 'Nur angezeigte Kalender werden umgeschaltet. Ausgeblendete Kalender bleiben unverändert. Temporär gelöste Fixierungen gelten nur für diese Sitzung.';
  }
  function renderList() {
    const list = el('list'); list.replaceChildren();
    const visible=visibleIndividualItems();
    for (const item of visible) {
      const label=document.createElement('label'); label.className='item' + (item.ambiguous?' ambiguous':'');
      const cb=document.createElement('input');cb.type='checkbox';cb.disabled=busy||item.ambiguous;
      cb.checked=!!item.key&&selected.has(item.key);
      if(isAlwaysVisible(item.key)){cb.disabled=true;cb.title='Im Setup unter „Immer angezeigte Kalender“ geschützt';}
      if (item.key) cb.dataset.key=item.key;
      const span=document.createElement('span');
      const title=document.createElement('span');title.className='item-name';title.textContent=item.name + (item.ambiguous?' (Name mehrfach vorhanden – gesperrt)':'');
      const meta=document.createElement('small');meta.className='item-meta';
      const community=areas.find(([id]) => id === areaOf(item.name));
      const category=types.find(([id]) => id === typeOf(item.name));
      meta.textContent = item.source === 'deck' ? 'Deck-Kalender' : item.source === 'tasks' ? 'Aufgabenkalender' :
        (community ? community[1] : 'Ohne Bereichcode') + ' · ' + (category ? category[1] : 'Nicht klassifiziert') + (item.source === 'shared' ? ' · geteilt' : '');
      span.append(title,meta);label.append(cb,span);list.appendChild(label);
      cb.addEventListener('change',()=> { if (cb.checked) selected.add(item.key);else selected.delete(item.key);selectionKind='manual';choice='manual';syncSummaryFromManual();commitSelection(); });
    }
    if (!visible.length) {const p=document.createElement('p');p.className='hint';p.textContent='Keine passenden Kalender – Suchbegriff oder Schnellfilter prüfen.'; list.appendChild(p);}
    renderCount(visible.length);
    renderIndividualActions(visible);
    updateIndividualFilterHeadings();
  }
  function renderCount(visibleCount) {
    const actionable=items.filter(x=>!x.ambiguous);
    const count=actionable.filter(x=>selected.has(x.key)).length;
    const suffix=typeof visibleCount==='number' ? ' · '+visibleCount+' Treffer' : '';
    el('count').textContent=count+' von '+actionable.length+' ausgewählt'+suffix;
  }
  function renderCriteria() {
    for (const [target, array, state] of [['areas', areas, selectedAreas], ['types', types, selectedTypes]]) {
      const container=el(target);container.replaceChildren();
      for (const [id, label] of array) {
        const wrapper=document.createElement('label');wrapper.className='check';
        const cb=document.createElement('input');cb.type='checkbox';cb.value=id;
        const related=items.filter(x=>!x.ambiguous && x.source!=='deck' && x.source!=='tasks' && (target==='areas'?areaOf(x.name)===id:typeOf(x.name)===id));
        const coverage=checkCoverage(related);
        cb.checked=selectionKind==='criteria' ? state.has(id) : coverage.all;
        cb.indeterminate=selectionKind!=='criteria' && coverage.part;
        const unavailable=related.length===0;
        cb.disabled=busy||unavailable;
        wrapper.classList.toggle('unavailable',unavailable);
        wrapper.title=unavailable?'Keine passenden Kalender im aktuellen Nextcloud-Kalenderbereich.':`${coverage.count} von ${coverage.total} Kalendern ausgewählt`;
        cb.title=wrapper.title;
        const text=document.createElement('span');text.textContent=label;
        const count=document.createElement('small');count.className='filter-count';count.textContent='('+related.length+')';
        wrapper.append(cb,text,count);container.appendChild(wrapper);
        cb.addEventListener('change',()=> {
          if(selectionKind==='manual') {
            for(const item of items.filter(x=>!x.ambiguous && x.source!=='deck' && x.source!=='tasks' && (target==='areas'?areaOf(x.name)===id:typeOf(x.name)===id))) {
              if(cb.checked) selected.add(item.key); else selected.delete(item.key);
            }
            choice='manual';syncSummaryFromManual();commitSelection();
            status('Kalenderauswahl angepasst. Für dynamische Filter die Bereiche und Kalenderarten direkt auswählen.');return;
          }
          const changed = target==='areas' ? selectedAreas : selectedTypes;
          if(cb.checked) changed.add(id); else changed.delete(id);
          selectionKind='criteria';choice='criteria';recomputeCriteria();commitSelection();
        });
      }
    }
  }
  function renderExtras() {
    for(const [id,src,state] of [['include-deck','deck',includeDeck],['include-tasks','tasks',includeTasks],['include-personal','personal',includePersonal],['include-shared','shared',includeShared],['include-common','common',includeCommon]]) {
      const cb=el(id);
      const coverage=checkCoverage(getAll(src));
      cb.checked=selectionKind==='criteria'?state:coverage.all;
      cb.indeterminate=selectionKind==='manual'&&coverage.part;
      cb.disabled=busy||coverage.total===0;
      const parent=cb.closest('label');
      parent.classList.toggle('unavailable',coverage.total===0);
      parent.title=coverage.total===0?'Keine passenden Kalender in der aktuellen Nextcloud-Kalenderliste.':coverage.count+' von '+coverage.total+' ausgewählt';
      cb.title=parent.title;
    }
    el('deck-count').textContent = '(' + getAll('deck').length + ')';
    el('tasks-count').textContent = '(' + getAll('tasks').length + ')';
    el('personal-count').textContent = '(' + getAll('personal').length + ')';
    el('shared-count').textContent = '(' + getAll('shared').length + ')';
    el('common-count').textContent = '(' + getAll('common').length + ')';
  }
  function renderNotes() {
    const desc=selectionKind==='criteria'
      ? 'Filter: Bereiche ODER, Arten ODER, Bereich × Art UND. Zuordnung über Namen und selbst festgelegte Regeln. Zusatzkalender können unabhängig ergänzt werden. ' + selected.size + ' passende Kalender. Gespeicherte Filter berücksichtigen neu hinzukommende passende Kalender.'
      : 'Feste Einzelauswahl: Häkchen zeigen voll/teilweise ausgewählte Kalender an. Änderungen an diesen Häkchen passen nur die betreffenden Kalender an.';
    el('note').textContent=desc+(items.some(x=>isAlwaysVisible(x.key))?' Immer angezeigte Kalender bleiben zusätzlich ausgewählt.':'')+' Änderungen werden erst mit „Auswahl anwenden“ übernommen. Profile liegen nur im lokalen Browserspeicher.';
    const issues=[];
    if (ambiguous.length) issues.push(ambiguous.length+' tatsächlich mehrdeutige Kalender (gleicher Name und Bereich) werden zur Sicherheit nicht verändert.');
    if (currentUser === 'unbekannt') issues.push('Benutzerkennung nicht erkannt: Browserprofile können bei mehreren Nextcloud-Konten im selben Browser gemeinsam sichtbar sein.');
    if (!storageWorking) issues.push('Browserspeicher nicht verfügbar: Profile können derzeit nicht dauerhaft gespeichert werden.');
    if (selectionKind==='criteria') {
      if ((!selectedAreas.size || !selectedTypes.size) && !includeDeck && !includeTasks && !includePersonal && !includeShared && !includeCommon) issues.push('Ohne Bereich bzw. Art und ohne Zusatzschalter ist die Auswahl leer.');
    }
    if (includeDeck && !items.some(x => x.source === 'deck')) issues.push('Kein Deck-Kalender im aktuellen Seitenmenü erkannt.');
    if (includeTasks && !items.some(x => x.source === 'tasks')) issues.push('Kein Aufgabenkalender im aktuellen Seitenmenü erkannt.');
    if (choice.startsWith('saved:')) {
      const p=profiles.find(x=>x.id===choice.slice(6));
      if (p && !p.filters) {
        const available=new Set(items.filter(x=>!x.ambiguous).map(x=>x.key));
        const missing=p.keys.filter(x=>!available.has(x));
        if (missing.length) issues.push('Dieses gespeicherte Profil enthält '+missing.length+' derzeit nicht verfügbare Kalender.');
      }
    }
    const box=el('warning');box.replaceChildren();
    if(issues.length){
      const details=document.createElement('details');details.className='warning-details';
const summary=document.createElement('summary');summary.textContent=issues.length+' Hinweis'+(issues.length===1?'':'e')+' zur aktuellen Auswahl';
      const w=document.createElement('div');w.className='warning';w.textContent=issues.join(' ');
      details.append(summary,w);box.append(details);
    }
  }
  function renderSummary() {
    const count=items.filter(x=>!x.ambiguous&&selected.has(x.key)).length;
    const c=selectionKind==='criteria'?selectedAreas.size+' Bereiche · '+selectedTypes.size+' Arten': 'Feste Auswahl';
    const extras=selectionKind==='criteria' ? [includeDeck&&'Deck',includeTasks&&'Aufgaben',includePersonal&&'Eigene',includeShared&&'Geteilte',includeCommon&&'Allgemein'].filter(Boolean) : [];
    const summary=count+' von '+(items.length-ambiguous.length)+' Kalendern · '+c+(extras.length?' · '+extras.join(', '):'');
    el('summary').textContent=summary;el('individual-summary').textContent=summary;
  }
  function renderAlwaysVisible() {
    const list=el('always-visible-list'),oldScroll=list.scrollTop,query=norm(cleanName(el('always-visible-search').value));
    list.replaceChildren();
    let shown=0;
    for(const item of items) {
      if(query&&!norm(item.name).includes(query)) continue;
      shown++;
      const label=document.createElement('label');label.className='always-item';
      const cb=document.createElement('input');cb.type='checkbox';cb.checked=alwaysVisibleKeys.has(item.key);
      cb.disabled=busy||item.ambiguous||!item.key;
      label.title=item.name+' · '+(sourceLabel[item.source]||'Kalender');
      const text=document.createElement('span');text.textContent=item.name;
      const meta=document.createElement('small');meta.textContent=sourceLabel[item.source]||'Kalender';
      if(item.ambiguous){label.title='Gleiche Namen im selben Abschnitt: keine eindeutige Kalenderzuordnung.';label.classList.add('unavailable');}
      if(personalCandidate?.key===item.key)meta.textContent+=' · Standard';
      label.append(cb,text,meta);list.appendChild(label);
      cb.addEventListener('change',()=>{
        const before=new Set(alwaysVisibleKeys);
        if(cb.checked) alwaysVisibleKeys.add(item.key);else alwaysVisibleKeys.delete(item.key);
        temporarilyReleasedKeys.delete(item.key);
        try{storeAlwaysVisible();}catch(e){alwaysVisibleKeys=before;renderAll();return status('Schutzauswahl konnte nicht gespeichert werden.');}
        if(personalCandidate?.key===item.key) {
          personalVerified=false;personalVerifyError='';
          if(cb.checked) verifyAndProtectPersonal(true);
        }
        renderAll();persistDraft();status(cb.checked?'Kalender zur Immer-Anzeige hinzugefügt.':'Immer-Anzeige für diesen Kalender aufgehoben.');
      });
    }
    if(!shown){const p=document.createElement('span');p.className='hint';p.textContent='Keine Kalender gefunden.';list.appendChild(p);}
    const resolved=items.filter(x=>!x.ambiguous&&isAlwaysVisible(x.key));
    const unassigned=[...alwaysVisibleKeys].filter(key=>!items.some(x=>x.key===key)).length;
    list.scrollTop=oldScroll;
    el('always-visible-note').textContent=resolved.length+' von '+alwaysVisibleKeys.size+' festgelegten Kalendern aktiv geschützt.'+
      (personalChecking?' Standardkalender: lesende CalDAV-Prüfung läuft.':personalVerifyError?' Standardkalender noch nicht geschützt: '+personalVerifyError:'')+
      (unassigned?' '+unassigned+' gespeicherte Kalender derzeit nicht verfügbar.':'')+
      (temporarilyReleasedKeys.size?' '+temporarilyReleasedKeys.size+' Fixierung(en) nur bis zum Schließen dieses Bookmarklets ausgesetzt.':'');
  }
  // Preview bleibt auch bei geringerer Fensterhöhe erreichbar. Wenn unterhalb
  // der Filter kein Platz bleibt, scrollt der gesamte Inhalt und beide Listen intern.
  let previewFrame=0;
  const previewExpanded={on:false,off:false};
  function previewSizing() {
    previewFrame=0;
    const preview=el('visibility-preview');
    if(currentTab!=='profiles') {preview.hidden=true;panel.classList.remove('preview-fit');return;}
    const scroll=shadow.querySelector('.scroll');
    const main=shadow.querySelector('[data-panel="profiles"]');
    const top=main.querySelector('.profile-top');
    const css=getComputedStyle(scroll);
    const usable=scroll.clientHeight-parseFloat(css.paddingTop)-parseFloat(css.paddingBottom);
    const others=[...main.children].filter(x=>x!==preview&&x!==top).reduce((total,node)=>{
      const style=getComputedStyle(node);
      return total+node.offsetHeight+parseFloat(style.marginTop||0)+parseFloat(style.marginBottom||0);
    },0);
    const free=Math.floor(usable-top.offsetHeight-others-21);
    const fits=free>=180;
    const height=fits?free:Math.max(160,Math.min(240,Math.floor(usable*.34)));
    const rows=Math.max(2,Math.min(14,Math.floor((height-73)/18)));
    preview.hidden=false;
    preview.style.height=height+'px';
    panel.classList.toggle('preview-fit',fits);
    for(const [id,source,which] of [['preview-on',selectedPreviewOn,'on'],['preview-off',selectedPreviewOff,'off']]){
      const list=el(id);list.replaceChildren();
      const expanded=!fits||previewExpanded[which]&&source.length>rows;
      list.classList.toggle('expanded',expanded);
      const limit=expanded?source.length:(source.length>rows?rows-1:rows);
      if(expanded&&fits){
        const collapse=document.createElement('button');collapse.type='button';collapse.className='preview-more';
        collapse.textContent='Weniger anzeigen';collapse.dataset.previewExpand=which;
        collapse.setAttribute('aria-expanded','true');list.appendChild(collapse);
      }
      for(const item of source.slice(0,limit)){
        const line=document.createElement('div');line.className='preview-entry';
        line.textContent=item.name;line.title=item.name+' · '+(sourceLabel[item.source]||'Kalender');if(which==='on'&&isAlwaysVisible(item.key)){const mark=document.createElement('small');mark.className='always-mark';mark.textContent=' · immer angezeigt';line.append(mark);line.title+=' · Immer angezeigter Kalender';}list.appendChild(line);
      }
      const remaining=source.length-limit;
      if(remaining>0){
        const more=document.createElement('button');more.type='button';more.className='preview-more';
        more.textContent='+'+remaining+' weitere';more.dataset.previewExpand=which;
        more.setAttribute('aria-expanded','false');more.title='Alle Kalender in dieser Liste anzeigen';list.appendChild(more);
      }
      if(!source.length){const empty=document.createElement('div');empty.className='preview-entry';empty.textContent='Keine Kalender';list.appendChild(empty);}
    }
  }
  for(const [id,which] of [['preview-on','on'],['preview-off','off']]){
    el(id).addEventListener('click',e=>{
      const btn=e.target.closest('button[data-preview-expand]');
      if(!btn)return;
      previewExpanded[which]=!previewExpanded[which];
      previewSizing();
    });
  }
  let selectedPreviewOn=[],selectedPreviewOff=[];
  function renderVisibilityPreview(){
    selectedPreviewOn=items.filter(x=>!x.ambiguous&&selected.has(x.key));
    selectedPreviewOff=items.filter(x=>!x.ambiguous&&!selected.has(x.key));
    el('preview-on-count').textContent=selectedPreviewOn.length;
    el('preview-off-count').textContent=selectedPreviewOff.length;
    if(previewFrame) cancelAnimationFrame(previewFrame);
    previewFrame=requestAnimationFrame(previewSizing);
  }
  function renderAll(){
    preserveAlwaysVisible();
    renderCriteria();renderExtras();renderPresetList();renderIndividualFilters();
    renderList();renderNotes();renderSummary();
    renderSort();renderSetup();renderVisibilityPreview();
  }
  // Minimal redraw for the most frequent operation: selecting calendars.
  // Other setup panels and sort-preview DOM are not rebuilt unnecessarily.
  function commitSelection(){
    preserveAlwaysVisible();persistDraft();
    // Only synchronize the two existing pickers; their option lists did not change.
    for(const id of ['presets','presets-individual']){
      el(id).value=choice.startsWith('built:')&&quickViews.some(x=>x.visible&&'built:'+x.id===choice)?choice:'criteria';
    }
    for(const id of ['saved-profiles','saved-profiles-individual']){
      el(id).value=choice.startsWith('saved:')?choice.slice(6):'';
    }
    renderCriteria();renderExtras();renderList();renderNotes();renderSummary();
    if(currentTab==='sorting')renderSort();
    renderVisibilityPreview();
  }
  function commitSort(){persistDraft();renderSort();}

  function usePreset(v) {
    if (v.startsWith('built:')) {
      const cfg=presetConfig(v.slice(6));
      if(cfg && (v==='built:none' || presetCount(v.slice(6))>0)) {
        if(cfg.special||Array.isArray(cfg.keys)||cfg.planning||cfg.unassigned){selected=new Set(items.filter(x=>matchesConfig(x,cfg)).map(x=>x.key));choice=v;selectionKind='manual';syncSummaryFromManual();commitSelection();return;}
        return setCriteria(cfg.areas,cfg.types,v,cfg);
      }
      return;
    }
    if (v.startsWith('saved:')) {
      const profile=profiles.find(x=>x.id===v.slice(6));
      if (!profile) return;
      if (profile.filters && Array.isArray(profile.filters.areas) && Array.isArray(profile.filters.types)) {
        return setCriteria(profile.filters.areas,profile.filters.types,v, {
          deck: profile.filters.includeDeck === true,
          tasks: profile.filters.includeTasks === true,
          personal: profile.filters.includePersonal === true,
          shared: profile.filters.includeShared === true,
          common: profile.filters.includeCommon === true
        });
      }
      selected=new Set(profile.keys);choice=v;selectionKind='manual';syncSummaryFromManual();commitSelection();return;
    }
    if (v==='criteria') return setCriteria([...selectedAreas],[...selectedTypes],v,{deck:includeDeck,tasks:includeTasks,personal:includePersonal,shared:includeShared,common:includeCommon});
    choice='manual';selectionKind='manual';syncSummaryFromManual();commitSelection();
  }
  function setBusy(value) {
    busy=value;
    for (const id of ['apply','save','all','none','all-individual','none-individual','individual-release-fixed','individual-toggle-visible','reload','reload-individual','presets','presets-individual','areas-all','areas-none','types-all','types-none','sort-mode','sort-copy','sort-pin-always','save-individual','reload-individual','saved-profiles','saved-profiles-individual','sort-reset','sort-save-set','sort-sets','preferred-area','settings-export','settings-import','always-visible-search','saved-manager-kind','saved-manager-list','saved-manager-new','saved-manager-duplicate','saved-manager-discard','saved-manager-search','saved-manager-mode']) el(id).disabled=value;
    renderCriteria();renderExtras();renderList();renderSort();renderAlwaysVisible();
    if(currentSetupTab==='saved')renderSavedManager();
  }
  // Capture-phase guard prevents other setup/list writes while CalDAV or a
  // calendar-toggle transaction is in progress, including dynamically made controls.
  for(const eventName of ['click','change','input','submit','dragstart','drop']){
    shadow.addEventListener(eventName,event=>{
      if(!busy)return;
      if(event.target.closest('button,input,select,textarea,[draggable],label,form')){
        event.preventDefault();event.stopImmediatePropagation();
      }
    },true);
  }
  const pause=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  async function apply() {
    if(busy)return;
    const unavailable=[...selected].filter(key=>!items.some(item=>!item.ambiguous&&item.key===key));
    if(unavailable.length&&!confirm('Dieses Profil enthält '+unavailable.length+' nicht mehr auffindbare Kalender. Trotzdem nur die verfügbaren Kalender umschalten?'))return;
    setBusy(true);
    status('Kalender werden umgeschaltet …');
    let changed=0;
    const failed=[];
    try{
      preserveAlwaysVisible();
      const requested=new Set(selected);
      const identifiers=items.filter(x=>!x.ambiguous).map(x=>({key:x.key,name:x.name}));
      for(const identifier of identifiers){
        try{
          // Vue may replace the row after a click: re-collect before each operation.
          let live=collectCalendars().find(x=>x.key===identifier.key);
          if(!live){failed.push(identifier.name+' (nicht mehr in der Kalenderliste)');continue;}
          const desired=requested.has(identifier.key);
          if(isEnabled(live)===desired)continue;
          if(!toggle(live)){failed.push(identifier.name+' (Schaltfläche nicht gefunden)');continue;}
          await pause(210);
          live=collectCalendars().find(x=>x.key===identifier.key);
          if(live&&isEnabled(live)!==desired){
            await pause(500);
            live=collectCalendars().find(x=>x.key===identifier.key);
          }
          if(live&&isEnabled(live)===desired)changed++;
          else failed.push(identifier.name+' (Umschaltung nicht bestätigt)');
        }catch(error){
          failed.push(identifier.name+' ('+(error?.message||error)+')');
        }
      }
      status(changed+' Kalender umgeschaltet.'+(failed.length?' Nicht erfolgreich: '+failed.join('; '):''));
    }catch(error){status('Kalenderumschaltung abgebrochen: '+(error?.message||error));}
    finally{setBusy(false);renderNotes();}
  }
