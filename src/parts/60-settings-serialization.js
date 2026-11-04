  const EXPORT_FORMAT='nextcloud-calendar-management-generic';
  function exportSettings(){
    return {
      format:EXPORT_FORMAT,schemaVersion:1,appVersion:VERSION,exportedAt:new Date().toISOString(),
      source:{origin:location.origin,user:currentUser},
      settings:{rules:structuredClone(rules),areaSuggestions:{version:1,codes:[...areaProposalCodes]},homeArea,keepPersonal:!!(personalCandidate&&alwaysVisibleKeys.has(personalCandidate.key)),alwaysVisible:[...alwaysVisibleKeys],
        profiles:profiles.map(p=>structuredClone(p)),sortSets:sortSets.map(s=>structuredClone(s)),quickViews:quickViews.map(v=>structuredClone(v)),quickGroups:[...quickGroups],
        ...draftData()}
};
  }
  function downloadSettings(){
    const payload=JSON.stringify(exportSettings(),null,2);
    const file=new Blob([payload],{type:'application/json;charset=utf-8'});
    const url=URL.createObjectURL(file);
    const a=document.createElement('a');a.href=url;
    a.download='nextcloud-calendar-management-generic-'+new Date().toISOString().slice(0,10)+'.json';
    document.body.appendChild(a);a.click();a.remove();
    // Revoke after navigation settles, not synchronously during the click.
    setTimeout(()=>URL.revokeObjectURL(url),60000);
    status('JSON-Sicherung erstellt. Bitte an einem sicheren Ort ablegen.');
  }
  function offerExport(kind){
    if(confirm(kind+' wurde gespeichert. Möchtest du deine aktuellen Einstellungen einschließlich aller Profile und Sortier-Sets als JSON sichern?'))downloadSettings();
  }
  function validStrings(v,max=500,maxNum=500){return Array.isArray(v)&&v.length<=maxNum&&v.every(x=>typeof x==='string'&&x.length<=max);}
  function validateImport(data){
    if(!data||data.format!==EXPORT_FORMAT||data.schemaVersion!==1||!data.settings||!data.source)throw Error('Keine unterstützte Kalender-Management-Sicherung.');
    const st=data.settings;
    if(!validateRules(st.rules))throw Error('Ungültige Erkennungsregeln in JSON.');
    if(st.areaSuggestions!==undefined&&!validAreaProposals(st.areaSuggestions))throw Error('Ungültige Bereichsvorschläge im JSON.');
    const savedProposalCodes=st.areaSuggestions?.codes||[];
    const importedAreas=[...st.rules.areas.map(x=>x.id),'unassigned'];
    if(!Array.isArray(st.profiles)||st.profiles.length>80||!Array.isArray(st.sortSets)||st.sortSets.length>50)throw Error('Ungültige Profil- oder Sortier-Set-Liste.');
    const fixId=v=>typeof v==='string'&&v.length>0&&v.length<=100;
    const fixLabel=v=>typeof v==='string'&&v.length>0&&v.length<=60;
    const ids=new Set();
    const safeProfiles=st.profiles.map(p=>{
      if(!p||!fixId(p.id)||!fixLabel(p.label)||!validStrings(p.keys))throw Error('Ungültiges Kalenderprofil.');
      if(ids.has(p.id))throw Error('Mehrfach vergebene Profil-ID.');ids.add(p.id);
      const q={id:p.id,label:p.label,keys:p.keys};
      if(p.filters){const f=p.filters;
        if(!validStrings(f.areas,50,50)||!validStrings(f.types,20,20))throw Error('Ungültige Profilfilter.');
        q.filters={areas:f.areas.filter(x=>importedAreas.includes(x)),types:f.types.filter(x=>st.rules.types.some(t=>t.id===x)),includeDeck:f.includeDeck===true,includeTasks:f.includeTasks===true,includePersonal:f.includePersonal===true,includeShared:f.includeShared===true,includeCommon:f.includeCommon===true};
      }
      return q;
    });
    ids.clear();
    const safeSets=st.sortSets.map(x=>{
      if(!x||!fixId(x.id)||!fixLabel(x.label)||!validStrings(x.keys)||!validStrings(x.pinned))throw Error('Ungültiges Sortier-Set.');
      if(ids.has(x.id))throw Error('Mehrfach vergebene Sortier-Set-ID.');ids.add(x.id);
      return {id:x.id,label:x.label,keys:x.keys,pinned:x.pinned};
    });
    const sl=st.selection||{},so=st.sorting||{};
    if(!validStrings(sl.keys||[])||!validStrings(sl.areas||[],50,50)||!validStrings(sl.types||[],20,20)||!validStrings(so.keys||[])||!validStrings(so.pinned||[]))throw Error('Ungültige Auswahl- oder Sortierdaten.');
    if(st.alwaysVisible!==undefined&&!validStrings(st.alwaysVisible,800,200))throw Error('Ungültige Immer-Anzeige-Kalenderliste.');
    const groupSource=st.quickGroups??[...new Set([...defaultQuickGroups,...(st.quickViews||[]).map(v=>v?.group).filter(x=>typeof x==='string')])];
    if(!validQuickGroups(groupSource))throw Error('Ungültige Schnellansicht-Kategorien in JSON.');
    const importedTypes=st.rules.types.map(x=>x.id);
    const importedViews=migrateLegacyQuickViews(st.quickViews??defaultQuickViews,importedAreas);
    if(!validQuickViews(importedViews,groupSource,importedAreas,importedTypes))throw Error('Ungültige Schnellansichten in JSON.');
    return {rules:st.rules,areaSuggestions:savedProposalCodes,quickGroups:groupSource,home:importedAreas.includes(st.homeArea)?st.homeArea:'',alwaysVisible:st.alwaysVisible!==undefined?st.alwaysVisible:(st.keepPersonal===true&&personalCandidate?[personalCandidate.key]:[]),profiles:safeProfiles,sortSets:safeSets,quickViews:importedViews.map(v=>({...structuredClone(v),config:normalizeQuickConfig(v.config)})),selection:sl,sorting:so};
  }
  async function importSettings(file){
    if(!file)return;
    if(file.size>2*1024*1024)throw Error('Datei zu groß (maximal 2 MB).');
    const obj=JSON.parse(await file.text());
    const data=validateImport(obj);
    if(obj.source.origin!==location.origin)throw Error('Die Sicherung stammt von einer anderen Nextcloud-Adresse.');
    if(obj.source.user!==currentUser)throw Error('Die Sicherung gehört zu einem anderen Nextcloud-Benutzer.');
    if(!confirm('Alle hier gespeicherten Kalenderprofile, Sortier-Sets und lokalen Einstellungen durch die JSON-Sicherung ersetzen? Die aktiven Kalender und die Server-Sortierung werden NICHT verändert.'))return;
    const saved=writeStorageBatch([
      [storageKey,data.profiles],[rulesKey,data.rules],
      [areaSuggestionsKey,{version:1,codes:data.areaSuggestions}],
      [sortSetsKey,data.sortSets],[homeAreaKey,data.home||null],
      [alwaysVisiblePrefKey,data.alwaysVisible],
      [draftKey,{selection:data.selection,sorting:data.sorting}],
      [quickViewsKey,data.quickViews],[quickGroupsKey,data.quickGroups]
    ]);
    if(!saved.ok)throw Error(saved.rolledBack?'Lokales Speichern fehlgeschlagen; Änderungen zurückgenommen.':'Lokales Speichern fehlgeschlagen; Rücknahme unvollständig. Bitte ursprüngliche JSON-Sicherung prüfen.');
    rules=structuredClone(data.rules);areaProposalCodes=[...data.areaSuggestions];areaProposalStorageError=false;
    lastAreaScan=discoverAreaProposalReport(items,rules);
    rebuildClassification();defaultQuickViews=makeDefaultQuickViews();
    profiles=data.profiles.map(p=>({...p,keys:migrateProfileKeys(p.keys)}));sortSets=data.sortSets;quickViews=data.quickViews;quickGroups=data.quickGroups;homeArea=data.home;quickEditorLoaded=false;
    classificationDraft=structuredClone(rules);classificationEditingId='';classificationNewIds.clear();classificationDirty=false;rememberClassificationOrigins();renderClassification(false);renderPreferredOptions();buildQuickChecks();
    const sl=data.selection,so=data.sorting;
    const available=new Set(items.map(x=>x.key));
    selected=new Set((sl.keys||[]).filter(x=>available.has(x)));
    selectedAreas=new Set((sl.areas||[]).filter(x=>allAreas.includes(x)));
    selectedTypes=new Set((sl.types||[]).filter(x=>allTypes.includes(x)));
    includeDeck=sl.extras?.deck===true;includeTasks=sl.extras?.tasks===true;includePersonal=sl.extras?.personal===true;includeShared=sl.extras?.shared===true;includeCommon=sl.extras?.common===true;
    selectionKind=sl.kind==='criteria'?'criteria':'manual';
    const c=typeof sl.choice==='string'?sl.choice:'';
    choice=(c==='criteria'||(c.startsWith('built:')&&presetConfig(c.slice(6)))||(c.startsWith('saved:')&&profiles.some(p=>p.id===c.slice(6))))?c:'manual';
    if(selectionKind==='criteria')recomputeCriteria();else syncSummaryFromManual();
    sortPlan=[...(so.keys||[]).filter(x=>available.has(x)),...items.map(x=>x.key).filter(x=>!(so.keys||[]).includes(x))];
    sortPinned=new Set((so.pinned||[]).filter(x=>available.has(x)));
    sortMode=['manual','original','active','selected','home','community','category','alphabet'].includes(so.mode)?so.mode:'manual';
    if(sortMode==='home'&&!homeArea)sortMode='manual';currentSortSet='';el('sort-mode').value=sortMode;
    alwaysVisibleKeys=new Set(data.alwaysVisible);temporarilyReleasedKeys.clear();personalVerified=false;personalVerifyError='';
    renderAll();
    status('Einstellungen importiert. Erkennungsregeln sind sofort aktiv. Keine Serveränderung.');
    if(personalCandidate&&alwaysVisibleKeys.has(personalCandidate.key))verifyAndProtectPersonal();
  }
