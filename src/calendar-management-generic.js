(function () {
  'use strict';
  const VERSION = '2.0.0';
  const HOST_ID = 'nc-calendar-management-generic-v2';
  const existing = document.getElementById(HOST_ID);
  if (existing) { existing.__kpDispose?.(); existing.remove(); return; }

  const calendarContainer = document.querySelector('.calendar-list-wrapper') ||
    document.querySelector('li.draggable-calendar-list-item')?.parentElement;
  if (!calendarContainer) {
    alert('Kalenderprofile: Keine Nextcloud-Kalenderliste gefunden. Bitte zuerst die Kalender-App öffnen.');
    return;
  }

  function cleanName(value) { return (value || '').replace(/\s+/g, ' ').trim(); }
  // Nextcloud Kalender 6.6.4: die calendar-list-wrapper hat direkte
  // Gruppen unterhalb der Captions „Geteilte Kalender", „Deck", „Aufgaben".
  // Ein Vue-ID wie nc-vue-86 ist NICHT stabil und darf nicht gespeichert werden.
  function calendarSource(row, root) {
    for (let node = row; node && node !== root; node = node.parentElement) {
      const explicit = node.getAttribute('data-calendar-source') || node.getAttribute('data-calendar-type');
      if (explicit && /^(deck|tasks?|aufgaben|personal|shared)$/i.test(explicit))
        return /deck/i.test(explicit) ? 'deck' : /task|aufgaben/i.test(explicit) ? 'tasks' : /shared/i.test(explicit) ? 'shared' : 'personal';
    }
    // Die Einträge stehen innerhalb einer direkten div-Gruppe; der
    // vorhergehende unmittelbare Geschwisterknoten ist die Abschnittsüberschrift.
    let group = row;
    while (group.parentElement && group.parentElement !== root) group = group.parentElement;
    if (group.parentElement !== root) return 'unknown';
    for (let node = group.previousElementSibling; node; node = node.previousElementSibling) {
      const name = cleanName(node.matches('.app-navigation-caption')
        ? node.textContent : node.querySelector('.app-navigation-caption')?.textContent).toLocaleLowerCase(navigator.language||'de-DE');
      if (name === 'deck') return 'deck';
      if (name === 'aufgaben' || name === 'tasks') return 'tasks';
      if (/geteilte kalender|shared calendars?/.test(name)) return 'shared';
      // Wenn die direkt vorherige Gruppe Kalender enthält, keine alte
      // Überschrift weiter hinten übernehmen.
      if (node.querySelector('.draggable-calendar-list-item, .app-navigation-entry__name')) break;
    }
    return 'personal';
  }
  function collectCalendars() {
    const root = calendarContainer;
    const candidates = [...root.querySelectorAll('li.draggable-calendar-list-item, .app-navigation-entry-wrapper')];
    const rows = [];
    const nodes = new Set();
    for (const element of candidates) {
      const row = element.closest('li.draggable-calendar-list-item, .app-navigation-entry-wrapper') || element;
      if (nodes.has(row)) continue;
      nodes.add(row);
      const name = cleanName(row.querySelector('.app-navigation-entry__name')?.textContent);
      if (!name) continue;
      const idNode = row.matches('[data-calendar-id],[data-calendar-url],[data-calendar-uri]') ? row :
        row.querySelector('[data-calendar-id],[data-calendar-url],[data-calendar-uri]');
      const nativeId = idNode && (idNode.getAttribute('data-calendar-url') ||
        idNode.getAttribute('data-calendar-id') || idNode.getAttribute('data-calendar-uri'));
      const source = calendarSource(row, root);
      rows.push({ row, name, nativeId: nativeId || '', source, key: '', ambiguous: false });
    }
    const nativeCounts = new Map(), scopedCounts = new Map();
    for (const item of rows) {
      const scope = item.source + ':' + item.name;
      scopedCounts.set(scope, (scopedCounts.get(scope) || 0) + 1);
      if (item.nativeId) nativeCounts.set(item.nativeId, (nativeCounts.get(item.nativeId) || 0) + 1);
    }
    for (const item of rows) {
      if (item.nativeId && nativeCounts.get(item.nativeId) === 1) {
        item.key = 'id:' + item.nativeId;
      } else if (item.source !== 'unknown' && scopedCounts.get(item.source + ':' + item.name) === 1) {
        item.key = 'scope:' + item.source + ':' + item.name;
      } else {
        // Zwei wirklich gleichnamige Kalender im selben Abschnitt bleiben
        // gesperrt, solange keine stabile ID im HTML bekannt ist.
        item.ambiguous = true;
      }
    }
    return rows;
  }

  let items = collectCalendars();
  if (!items.length) {
    alert('Kalenderprofile: Kalenderliste erkannt, aber keine Kalender-Namen gefunden. Die Oberfläche könnte anders aufgebaut sein.');
    return;
  }
  function isEnabled(item) {
    const target = item.row.matches('.app-navigation-entry') ? item.row : item.row.querySelector('.app-navigation-entry');
    return !(item.row.classList.contains('disabled') || target?.classList.contains('disabled'));
  }
  function toggle(item) {
    const row = item.row;
    const icon = row.querySelector('.checkbox-blank-outline-icon, .checkbox-marked-icon');
    const input = row.querySelector('input[type="checkbox"]');
    const navIcon = row.querySelector('.app-navigation-entry__icon');
    const target = icon || input || navIcon;
    if (!target) return false;
    target.click();
    return true;
  }

  const currentUser = String(window.OC?.getCurrentUser?.()?.uid ||
    (typeof window.OC?.currentUser === 'string' ? window.OC.currentUser : '') ||
    document.body?.dataset?.userId || 'unbekannt');
  const storageKey = 'nc-calendar-management-generic-v2:' + location.pathname.split('/apps/calendar')[0] + ':' + currentUser;
  // Centralized best-effort localStorage transaction for settings that span
  // multiple keys. All originals are read before writes begin.
  function writeStorageBatch(entries){
    const original=[];
    try{
      for(const [key] of entries)original.push(localStorage.getItem(key));
    }catch(error){return {ok:false,rolledBack:true,error};}
    let touched=0;
    try{
      for(const [key,value] of entries){
        if(value===null)localStorage.removeItem(key);
        // Existing scalar preferences (e.g. preferred-area-v1) are stored as
        // plain strings; collections are JSON-encoded. Preserve both formats.
        else localStorage.setItem(key,typeof value==='string'?value:JSON.stringify(value));
        touched++;
      }
      return {ok:true,rolledBack:true};
    }catch(error){
      let rolledBack=true;
      for(let i=touched-1;i>=0;i--){
        try{const [key]=entries[i];if(original[i]===null)localStorage.removeItem(key);else localStorage.setItem(key,original[i]);}
        catch(_){rolledBack=false;}
      }
      return {ok:false,rolledBack,error};
    }
  }

  let profiles = [];
  let storageWorking = true;
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (Array.isArray(saved)) profiles = saved.filter(p => p && typeof p.id === 'string' &&
      typeof p.label === 'string' && Array.isArray(p.keys)).slice(0, 80);
  } catch (error) { storageWorking = false; }
  function persist() {
    try { localStorage.setItem(storageKey, JSON.stringify(profiles)); storageWorking = true; return true; }
    catch (error) { storageWorking = false; return false; }
  }

  // Migrationshilfe für Profile aus 0.1–0.4. Alte Namensschlüssel werden
  // ausschließlich dann übersetzt, wenn der Name heute eindeutig ist.
  // Mehrdeutige alte Zuordnungen werden nicht erraten.
  const uniqueByName = new Map();
  for (const item of items) {
    const old = 'name:' + item.name;
    if (!uniqueByName.has(old)) uniqueByName.set(old, []);
    uniqueByName.get(old).push(item);
  }
  function migrateProfileKeys(keys) {
    const result = [];
    for (const key of keys) {
      if (items.some(item => item.key === key)) {result.push(key);continue;}
      const candidates = uniqueByName.get(key) || [];
      if (candidates.length === 1 && !candidates[0].ambiguous) result.push(candidates[0].key);
      else result.push(key);
    }
    return [...new Set(result)];
  }
  // Nur im Speicher migrieren; erst beim nächsten bewussten Speichern
  // werden neue Schlüssel persistiert, bestehende Daten bleiben unberührt.
  profiles = profiles.map(p => ({...p, keys: migrateProfileKeys(p.keys)}));
  const active = items.filter(x => !x.ambiguous && isEnabled(x)).map(x => x.key);
  let selected = new Set(active);
  let choice = 'manual';
  let busy = false;
  let ambiguous = items.filter(x => x.ambiguous);
  // Instance-agnostic classifier. No organization names, URLs or calendar IDs are embedded.
  // Text patterns are literal, not user-supplied regular expressions.
  const rulesKey=storageKey+':classification-rules-v1';
  const defaultRules={
    areas:[],
    types:[
      {id:'resources',label:'Räume & Ressourcen',keywords:['raum','room','resource','ressource','equipment','fahrzeug']},
      {id:'absence',label:'Urlaub & Abwesenheit',keywords:['urlaub','vacation','holiday','ferien','feiertag','absence','abwesenheit','leave']},
      {id:'projects',label:'Projekte',keywords:['projekt','project','sprint','release']},
      {id:'team',label:'Team & Zusammenarbeit',keywords:['team','gruppe','group','abteilung','department']},
      {id:'work',label:'Berufliches',keywords:['arbeit','work','business','office','meeting','besprechung']},
      {id:'private',label:'Privates',keywords:['privat','private','familie','family','geburtstag','birthday']},
      {id:'events',label:'Veranstaltungen & Termine',keywords:['veranstaltung','event','termin','appointment','conference','konferenz']},
      {id:'other',label:'Sonstige',keywords:[]}
    ],
    commonKeywords:['feiertage','ferien','holidays','birthdays','geburtstage']
  };
  function validateRules(value){
    const ident=v=>typeof v==='string'&&/^[a-z][a-z0-9_-]{0,35}$/.test(v);
    // All keyword lists support literal fragments, '*' as a wildcard, and
    // '<pattern>' as a negative condition. Older plain keywords remain valid.
    const words=a=>Array.isArray(a)&&a.length<=30&&a.every(v=>typeof v==='string'&&v.length<=70&&v===v.trim()&&!!parseKeywordPattern(v));
    if(!value||!Array.isArray(value.areas)||value.areas.length>30||!Array.isArray(value.types)||value.types.length<1||value.types.length>20||!words(value.commonKeywords))return false;
    const ids=new Set();
    for(const a of value.areas){
      if(!a||!ident(a.id)||a.id==='unassigned'||ids.has(a.id)||typeof a.label!=='string'||!a.label.trim()||a.label.length>60||!words(a.keywords))return false;
      ids.add(a.id);
    }
    ids.clear();
    for(const t of value.types){
      if(!t||!ident(t.id)||ids.has(t.id)||typeof t.label!=='string'||!t.label.trim()||t.label.length>60||!words(t.keywords))return false;
      ids.add(t.id);
    }
    return ids.has('other');
  }
  let rules=structuredClone(defaultRules);
  try{const saved=JSON.parse(localStorage.getItem(rulesKey)||'null');if(validateRules(saved))rules=saved;}catch(e){}
  function norm(name){return String(name||'').normalize('NFKC').toLocaleLowerCase(navigator.language||'de-DE');}
  // Pattern rules are shared by areas, calendar types and common calendars.
  // A pattern is a case-insensitive substring match. '*' matches zero or more
  // characters; '<pattern>' vetoes the complete rule, regardless of line order.
  // No regular expressions from untrusted user input are ever executed.
  function parseKeywordPattern(value){
    if(typeof value!=='string'||!value||value.length>70||value!==value.trim())return null;
    const negative=value.startsWith('<')&&value.endsWith('>');
    const body=negative?value.slice(1,-1):value;
    if(/[<>]/.test(body)||(!negative&&/[<>]/.test(value)))return null;
    // A rule must contain at least two actual characters besides wildcards.
    if(body.replace(/\*/g,'').trim().length<2)return null;
    return {negative,pattern:norm(body)};
  }
  function keywordMatchesName(normalizedName,pattern){
    if(!pattern.includes('*'))return normalizedName.includes(pattern);
    let position=0;
    for(const part of pattern.split('*')){
      if(!part)continue;
      const next=normalizedName.indexOf(part,position);
      if(next===-1)return false;
      position=next+part.length;
    }
    return true;
  }
  function containsKeywordExclusion(normalizedName,keywords){
    return keywords.some(value=>{
      const entry=parseKeywordPattern(value);
      return entry?.negative&&keywordMatchesName(normalizedName,entry.pattern);
    });
  }
  function matchesKeywords(normalizedName,keywords){
    // Positive terms are alternatives; any matching exclusion wins.
    // A list containing only exclusions is not an implicit match-all rule.
    let included=false;
    for(const value of keywords){
      const entry=parseKeywordPattern(value);
      if(!entry||!keywordMatchesName(normalizedName,entry.pattern))continue;
      if(entry.negative)return false;
      included=true;
    }
    return included;
  }
  function suffixArea(name){
    // Common, but optional naming convention: "Teamkalender (SALES)".
    const match=String(name||'').trim().match(/\(([\p{L}\p{N}][\p{L}\p{N}_.-]{0,19})\)\s*$/u);
    return match?norm(match[1]):'';
  }
  // A configured area may use an ASCII ID different from its visible suffix:
  // e.g. (BÜH) -> bue. Such suffixes must not create a second virtual area.
  // Only exact suffix aliases count here, so keyword matching remains unchanged.
  function configuredAreaForSuffix(suffix,configuration=rules){
    if(!suffix)return null;
    const marker='('+suffix+')';
    return configuration.areas.find(area=>area.id===suffix||area.keywords.some(keyword=>{
      const entry=parseKeywordPattern(keyword);
      if(!entry||entry.negative||entry.pattern.includes('*'))return false;
      return entry.pattern===suffix||entry.pattern===marker;
    }))||null;
  }
  // Explicit area rules win over name suffixes. Otherwise resolve known
  // suffix aliases before considering the auto-discovered virtual area.
  // Cache only derived classifications, never DOM nodes or permission state.
  // Invalidate on every committed rule replacement / JSON import.
  const classificationCache=new Map();
  function invalidateClassification(){classificationCache.clear();}
  function classifyName(name){
    const key=String(name||'');
    if(classificationCache.has(key))return classificationCache.get(key);
    const normalized=norm(key);
    let area='unassigned';
    for(const rule of rules.areas){
      if(matchesKeywords(normalized,rule.keywords)){area=rule.id;break;}
    }
    if(area==='unassigned'){
      const suffix=suffixArea(key),configured=configuredAreaForSuffix(suffix);
      // Do not bypass explicit exclusions when resolving a configured suffix.
      if(configured&&!containsKeywordExclusion(normalized,configured.keywords))area=configured.id;
    }
    let type='other';
    for(const rule of rules.types){
      if(rule.id!=='other'&&matchesKeywords(normalized,rule.keywords)){type=rule.id;break;}
    }
    const result={area,type,common:matchesKeywords(normalized,rules.commonKeywords)};
    if(classificationCache.size>=2048)classificationCache.clear();
    classificationCache.set(key,result);
    return result;
  }
  const areaOf=name=>classifyName(name).area;
  const typeOf=name=>classifyName(name).type;
  const commonName=name=>classifyName(name).common;
  // System-generated Deck/Tasks calendars are managed by their own source filters.
  // Their calendar-name suffixes (e.g. "(DECK)") must not create empty
  // organization areas, unless the user explicitly configures such an area.
  // Proposal lifecycle: one initial scan per browser/Nextcloud user; after that
  // only a deliberate click on "Vorschläge ermitteln" scans the live calendar DOM.
  // An unknown suffix never becomes a filter category without user approval.
  const areaSuggestionsKey=storageKey+':area-proposals-v1';
  const systemSuffixes=new Set(['deck','tasks','aufgaben','personal','shared']);
  // Detect short parenthesized identifiers at any position, not only at the
  // end. Also support explicit leading segment prefixes (e.g. "IT – Termine").
  // Never guess a new area from an arbitrary single unstructured calendar name.
  function candidateAreaCodes(name){
    const value=String(name||''),result=new Set();
    const isCode=raw=>raw.length<=15&&(/[\p{Lu}]/u.test(raw)&&raw===raw.toLocaleUpperCase(navigator.language||'de-DE')||raw.length<=3);
    const bracketMatches=[...value.matchAll(/[\(\[]([\p{L}][\p{L}\p{N}_.-]{1,19})[\)\]]/gu)];
    for(const match of bracketMatches){
      const raw=match[1];
      const atEdge=match.index===0||match.index+match[0].length===value.length;
      // Keep the previously supported lowercase/title-case trailing `(sales)`.
      // In a name with several parentheses, a final `(Beate)` after an actual
      // `(BWH)` code is more likely an owner name and must not be suggested.
      const likelyOwner=bracketMatches.length>1&&match.index>0&&/^[\p{Lu}][\p{Ll}]+$/u.test(raw);
      if(isCode(raw)||(atEdge&&!likelyOwner))result.add(norm(raw));
    }
    const prefix=value.match(/^([\p{L}][\p{L}\p{N}_.-]{1,19})\s*(?:\s[-–—]\s|[:|])\s*\S/u);
    if(prefix)result.add(norm(prefix[1]));
    return [...result].filter(code=>code.length>=2&&!systemSuffixes.has(code)&&!/^[0-9]+$/.test(code));
  }
  function discoverAreaProposalReport(calendarRows=items,configuration=rules){
    const proposed=new Map(),covered=new Set(),examples=new Map();
    let inspected=0,sourceExcluded=0,withCodes=0;
    for(const item of calendarRows){
      if(item.ambiguous||item.source==='deck'||item.source==='tasks') {sourceExcluded++;continue;}
      inspected++;
      const codes=candidateAreaCodes(item.name);
      if(codes.length)withCodes++;
      for(const code of codes){
        if(configuredAreaForSuffix(code,configuration)){covered.add(code);continue;}
        proposed.set(code,(proposed.get(code)||0)+1);
        if(!examples.has(code))examples.set(code,item.name);
      }
    }
    const codes=[...proposed.keys()].sort((a,b)=>a.localeCompare(b)).slice(0,100);
    return {codes,counts:proposed,examples,total:calendarRows.length,inspected,sourceExcluded,withCodes,covered:covered.size};
  }
  function discoverAreaProposals(calendarRows=items,configuration=rules){
    return discoverAreaProposalReport(calendarRows,configuration).codes;
  }
  function validAreaProposals(data){
    return !!data&&data.version===1&&Array.isArray(data.codes)&&data.codes.length<=100&&
      data.codes.every(code=>typeof code==='string'&&code.length>=1&&code.length<=20&&
        code===norm(code)&&!systemSuffixes.has(code));
  }
  let areaProposalCodes=[];
  let areaProposalStorageError=false;
  let lastAreaScan=null;
  function storeAreaProposals(codes){
    const deduped=[...new Set(codes)].sort((a,b)=>a.localeCompare(b)).slice(0,100);
    try{
      localStorage.setItem(areaSuggestionsKey,JSON.stringify({version:1,codes:deduped}));
      areaProposalCodes=deduped;areaProposalStorageError=false;return true;
    }catch(error){areaProposalStorageError=true;return false;}
  }
  // A failed read must not overwrite an existing configuration or pretend to
  // have persisted the scan. A malformed old cache may be safely rescanned.
  try{
    const saved=localStorage.getItem(areaSuggestionsKey);
    if(saved!==null){
      const data=JSON.parse(saved);
      if(validAreaProposals(data))areaProposalCodes=[...data.codes];
      else storeAreaProposals(discoverAreaProposals());
    }else storeAreaProposals(discoverAreaProposals());
  }catch(error){areaProposalStorageError=true;areaProposalCodes=[];}
  lastAreaScan=discoverAreaProposalReport(items,rules);
  function areaIdentifierFromSuffix(code,existing){
    const ascii=norm(code).replace(/ä/g,'ae').replace(/ö/g,'oe').replace(/ü/g,'ue').replace(/ß/g,'ss')
      .normalize('NFKD').replace(/[\u0300-\u036f]/g,'')
      .replace(/[^a-z0-9_-]/g,'-').replace(/^-+|-+$/g,'');
    let base=ascii.slice(0,32)||'bereich';
    if(!/^[a-z]/.test(base))base='bereich-'+base;
    base=base.slice(0,32);
    let id=base,index=2;
    while(id==='unassigned'||existing.some(entry=>entry.id===id))id=base+'-'+index++;
    return id;
  }
  const areas=[],types=[],allAreas=[],allTypes=[],presetSections=[];
  function rebuildClassification(){
    invalidateClassification();
    areas.splice(0,areas.length,...rules.areas.map(a=>[a.id,a.label]));
    areas.push(['unassigned','Ohne Bereich']);
    types.splice(0,types.length,...rules.types.map(t=>[t.id,t.label]));
    allAreas.splice(0,allAreas.length,...areas.map(([id])=>id));
    allTypes.splice(0,allTypes.length,...types.map(([id])=>id));
    const typeLabel=(id,fallback)=>types.find(([kind])=>kind===id)?.[1]||fallback;
    presetSections.splice(0,presetSections.length,
      ['Übersichten',[
        ['all','Alle Kalender'],['resources',typeLabel('resources','Räume & Ressourcen')],['absence',typeLabel('absence','Urlaub & Abwesenheit')],
        ['projects',typeLabel('projects','Projekte')],['team',typeLabel('team','Team & Zusammenarbeit')],['work-type',typeLabel('work','Berufliche Kalender')],
        ['private-type',typeLabel('private','Private Kalender')],['events',typeLabel('events','Veranstaltungen & Termine')]
      ]],
      ['Nach Bereich',areas.map(([id,label])=>['area-'+id,label])],
      ['Nach Herkunft',[
        ['personal','Eigene Kalender'],['shared','Geteilte Kalender'],['work','Deck & Aufgaben'],
        ['common','Allgemeine Kalender']
      ]]
    );
  }
  rebuildClassification();
  let selectedAreas = new Set(allAreas);
  let selectedTypes = new Set(allTypes);
  let includeDeck = false;
  let includeTasks = false;
  let includePersonal = false;
  let includeShared = false;
  let includeCommon = false;
  const homeAreaKey=storageKey+':preferred-area-v1';
  let homeArea='';
  try {
    const raw=localStorage.getItem(homeAreaKey)||'';
    // Beta 15's batch writer sometimes JSON-encoded a scalar preference.
    // Accept both the previous quoted value and the normal plain-string form.
    const candidate=raw.startsWith('"')?JSON.parse(raw):raw;
    if(typeof candidate==='string'&&allAreas.includes(candidate))homeArea=candidate;
  }catch(e){}
  let sortMode = 'original';
  // Sort sets are deliberately stored separately from visibility profiles.
  const sortSetsKey = storageKey + ':sorting-sets-v1';
  const draftKey=storageKey+':current-selection-v1';
  let sortSets = [];
  try {
    const data = JSON.parse(localStorage.getItem(sortSetsKey) || '[]');
    if (Array.isArray(data)) sortSets = data.filter(x => x && typeof x.id === 'string' &&
      typeof x.label === 'string' && Array.isArray(x.keys) && Array.isArray(x.pinned)).slice(0,50);
  } catch (e) { /* storage might not be available */ }
  let sortPlan = items.map(x => x.key);
  let sortPinned = new Set();
  let currentSortSet = '';
  let sortReloadRequired = false;
  let dragSortKey = null;
  function persistSortSets() {
    try { localStorage.setItem(sortSetsKey,JSON.stringify(sortSets)); return true; }
    catch (e) { return false; }
  }
  let selectionKind = 'manual';
  let currentTab = 'profiles';
  let sortCheckBusy = false;
  const sourceLabel = {personal:'Eigene Kalender',shared:'Geteilte Kalender',deck:'Deck',tasks:'Aufgaben',unknown:'Sonstige'};
  const allExtraControls = ['include-common','include-personal','include-shared','include-deck','include-tasks'];
  function detectPersonalCandidate() {
    const candidates = items.filter(x => !x.ambiguous && x.source === 'personal' &&
      x.name.normalize('NFKC').toLocaleLowerCase(navigator.language||'de-DE') === 'persönlich');
    return candidates.length === 1 ? candidates[0] : null;
  }
  let personalCandidate = detectPersonalCandidate();
  // Separate per-user storage; migrate the previous personal-calendar preference.
  const personalPrefKey = storageKey + ':keep-default-personal';
  const alwaysVisiblePrefKey = storageKey + ':always-visible-calendars-v1';
  let alwaysVisibleKeys = new Set();
  // Nur im laufenden Bookmarklet: Setup-Fixierungen vorübergehend aussetzen.
  // Keine Speicherung, kein Export und keine Veränderung der Setup-Regeln.
  const temporarilyReleasedKeys = new Set();
  let personalVerified = false, personalChecking = false, personalVerifyError = '';
  try {
    const saved = localStorage.getItem(alwaysVisiblePrefKey);
    if (saved !== null) {
      const data = JSON.parse(saved);
      if (Array.isArray(data)) alwaysVisibleKeys = new Set(data.filter(x => typeof x === 'string').slice(0,200));
    } else if (personalCandidate) {
      // New installs: personal calendar preselected. Old explicit opt-in is kept.
      alwaysVisibleKeys.add(personalCandidate.key);
    }
  } catch (e) { if (personalCandidate) alwaysVisibleKeys.add(personalCandidate.key); }
  function isAlwaysVisible(key) {
    return alwaysVisibleKeys.has(key) && !temporarilyReleasedKeys.has(key) && (key !== personalCandidate?.key || personalVerified);
  }
  function preserveAlwaysVisible() {
    for (const item of items) if (!item.ambiguous && isAlwaysVisible(item.key)) selected.add(item.key);
  }
  function storeAlwaysVisible() {
    localStorage.setItem(alwaysVisiblePrefKey, JSON.stringify([...alwaysVisibleKeys]));
  }
  const getAll = type => items.filter(x=>!x.ambiguous && (type === 'common' ? commonName(x.name) : x.source===type));
  function checkCoverage(members) {
    const count=members.filter(x=>selected.has(x.key)).length;
    return {all: members.length>0&&count===members.length,part:count>0&&count<members.length,count,total:members.length};
  }
  function syncSummaryFromManual() {
    // Manual and fixed saved profiles show TRUE checked/partial checkbox coverage.
    // They are not misrepresented as saved dynamic filters.
    const active=items.filter(x=>!x.ambiguous && selected.has(x.key));
    selectedAreas = new Set(allAreas.filter(id=>active.some(x=>areaOf(x.name)===id && x.source!=='deck'&&x.source!=='tasks')));
    selectedTypes = new Set(allTypes.filter(id=>active.some(x=>typeOf(x.name)===id && x.source!=='deck'&&x.source!=='tasks')));
    includeDeck = active.some(x=>x.source==='deck');
    includeTasks = active.some(x=>x.source==='tasks');
    includePersonal = active.some(x=>x.source==='personal');
    includeShared = active.some(x=>x.source==='shared');
    includeCommon = active.some(x=>commonName(x.name));
  }

  // Areas AND types form an intersection. Multiple selections within a dimension use OR.
  function matchesCriteria(item) {
    if (!item.key) return false;
    if (item.source === 'deck') return includeDeck;
    if (item.source === 'tasks') return includeTasks;
    if (includePersonal && item.source === 'personal') return true;
    if (includeShared && item.source === 'shared') return true;
    if (includeCommon && commonName(item.name)) return true;
    return selectedAreas.has(areaOf(item.name)) && selectedTypes.has(typeOf(item.name));
  }
  function recomputeCriteria() {
    selected = new Set(items.filter(x => !x.ambiguous && matchesCriteria(x)).map(x => x.key));
  }
  function defaultPresetConfig(id) {
    if (id==='all')return {areas:allAreas,types:allTypes,deck:true,tasks:true,personal:true,shared:true,common:true};
    if (id==='none')return {areas:[],types:[]};
    if (id==='personal')return {areas:[],types:[],personal:true};
    if (id==='shared')return {areas:[],types:[],shared:true};
    if (id==='work')return {areas:[],types:[],deck:true,tasks:true};
    if (id==='common')return {areas:[],types:[],common:true};
    if (id.startsWith('area-') && allAreas.includes(id.slice(5)))return {areas:[id.slice(5)],types:allTypes};
    const mapping={'work-type':'work','private-type':'private'};
    const kind=mapping[id]||id;
    if (allTypes.includes(kind))return {areas:allAreas,types:[kind]};
    return null;
  }
  // Custom categories are local, user-specific and included in JSON backups.
  const quickViewsKey=storageKey+':quick-views-v1';
  const quickGroupsKey=storageKey+':quick-groups-v1';
  const defaultQuickGroups=presetSections.map(([group])=>group);
  const makeDefaultQuickViews=()=>presetSections.flatMap(([group,views])=>views.map(([id,label])=>({id,label,group,visible:true,config:defaultPresetConfig(id)}))).filter(x=>x.config!==null);
  let defaultQuickViews=makeDefaultQuickViews();
  let quickGroups=[...defaultQuickGroups];
  const specialRules=[];
  function normalizeQuickConfig(c){
    if(!c?.special)return c;
    const replacement=defaultPresetConfig(c.special);
    return replacement||c;
  }
  function validQuickGroups(data){
    return Array.isArray(data)&&data.length>=1&&data.length<=20&&data.every(x=>typeof x==='string'&&x.trim()===x&&x.length>=1&&x.length<=45)&&new Set(data.map(norm)).size===data.length;
  }
  function validQuickViews(data,groups=quickGroups,allowedAreas=allAreas,allowedTypes=allTypes){
    if(!Array.isArray(data)||data.length>60)return false;
    const ids=new Set();
    return data.every(v=>{
      if(!v||typeof v.id!=='string'||!/^[-\p{L}\p{N}_.]{1,90}$/u.test(v.id)||ids.has(v.id)||
        typeof v.label!=='string'||!v.label.trim()||v.label.length>70||!groups.includes(v.group)||typeof v.visible!=='boolean')return false;
      ids.add(v.id);const c=v.config;
      if(!c||!Array.isArray(c.areas)||!Array.isArray(c.types)||c.areas.length>50||c.types.length>20||
        !c.areas.every(x=>allowedAreas.includes(x))||!c.types.every(x=>allowedTypes.includes(x)))return false;
      if(c.special!==undefined&&!specialRules.includes(c.special))return false;
      if(c.keys!==undefined&&(!Array.isArray(c.keys)||c.keys.length>500||!c.keys.every(x=>typeof x==='string'&&x.length<=800)))return false;
      return ['deck','tasks','personal','shared','common','planning','unassigned'].every(k=>c[k]===undefined||typeof c[k]==='boolean');
    });
  }
  // Beta 7 allowed temporary suffix areas. Preserve user-defined quick views
  // while dropping obsolete auto-generated area views and unknown filter IDs.
  function migrateLegacyQuickViews(source,allowedAreas=allAreas){
    if(!Array.isArray(source))return source;
    const allowed=new Set(allowedAreas);
    return source.filter(v=>{
      if(!v||!v.config)return true; // validation below reports malformed entries
      const legacyId=typeof v.id==='string'&&v.id.startsWith('area-')?v.id.slice(5):'';
      return !(legacyId&&!allowed.has(legacyId)&&v.group==='Nach Bereich'&&
        v.label===legacyId.toLocaleUpperCase(navigator.language||'de-DE')&&
        Array.isArray(v.config.areas)&&v.config.areas.length===1&&v.config.areas[0]===legacyId);
    }).map(v=>v&&v.config&&Array.isArray(v.config.areas)?
      {...v,config:{...v.config,areas:v.config.areas.filter(id=>allowed.has(id))}}:v);
  }
  let quickViews=defaultQuickViews.map(x=>structuredClone(x));
  try{
    const saved=JSON.parse(localStorage.getItem(quickViewsKey)||'null');
    const groups=JSON.parse(localStorage.getItem(quickGroupsKey)||'null');
    const inferred=Array.isArray(saved)?[...new Set([...defaultQuickGroups,...saved.map(x=>x?.group).filter(x=>typeof x==='string')])]:defaultQuickGroups;
    const resolved=validQuickGroups(groups)?groups:inferred;
    const migrated=migrateLegacyQuickViews(saved);
    if(validQuickGroups(resolved)&&validQuickViews(migrated,resolved)){
      quickGroups=resolved;quickViews=migrated.map(v=>({...v,config:normalizeQuickConfig(v.config)}));
    }
  }catch(e){}
  function presetConfig(id){return (id==='all'||id==='none')?defaultPresetConfig(id):(quickViews.find(x=>x.id===id)?.config||null);}
  function saveQuickViews(next,groups=quickGroups){
    if(!validQuickGroups(groups)||!validQuickViews(next,groups))return false;
    if(!writeStorageBatch([[quickViewsKey,next],[quickGroupsKey,groups]]).ok)return false;
    quickViews=next;quickGroups=groups;
    return true;
  }
  function matchesConfig(item,cfg){
    if(!item.key||item.ambiguous)return false;
    if(Array.isArray(cfg.keys))return cfg.keys.includes(item.key);
    if(item.source==='deck')return !!cfg.deck;
    if(item.source==='tasks')return !!cfg.tasks;
    if(cfg.personal&&item.source==='personal')return true;
    if(cfg.shared&&item.source==='shared')return true;
    if(cfg.common&&commonName(item.name))return true;
    const group=areaOf(item.name);
    return cfg.areas.includes(group) && cfg.types.includes(typeOf(item.name));
  }
  function presetCount(id) {
    const cfg=presetConfig(id);
    return cfg ? items.filter(x=>matchesConfig(x,cfg)).length : 0;
  }
  function setCriteria(areaCodes, typeCodes, newChoice, extras = {}) {
    selectedAreas = new Set(areaCodes.filter(x => allAreas.includes(x)));
    selectedTypes = new Set(typeCodes.filter(x => allTypes.includes(x)));
    includeDeck = !!extras.deck;
    includeTasks = !!extras.tasks;
    includePersonal = !!extras.personal;
    includeShared = !!extras.shared;
    includeCommon = !!extras.common;
    selectionKind = 'criteria';
    choice = newChoice;
    recomputeCriteria();
    commitSelection();
  }

  // Die Bedienoberfläche liegt in einem gleich-originigen, leeren iframe.
  // Tastaturereignisse bleiben im iframe und erreichen keine bereits registrierten
  // Nextcloud-Handler auf dem übergeordneten document/window (auch Capture-Handler).
  const host = document.createElement('iframe');
  host.id = HOST_ID;
  host.title = 'Kalenderprofile';
  host.setAttribute('aria-label',host.title);
  host.style.cssText = 'position:fixed;inset:0;width:100%;height:100%;border:0;background:transparent;z-index:2147483645;';
  document.body.appendChild(host);
  const appDoc = host.contentDocument;
  if (!appDoc || !appDoc.body) { host.remove(); alert('Kalenderprofile: Isoliertes Fenster konnte nicht gestartet werden.'); return; }
  // Nextcloud-Farbvariablen sind im iframe nicht automatisch vererbbar.
  const upstream = getComputedStyle(document.documentElement);
  for (const name of ['--color-main-background','--color-main-text','--color-border','--color-border-dark','--color-primary-element','--color-primary-element-text','--color-text-maxcontrast','--color-background-hover','--color-background-dark','--border-radius-element','--border-radius-large']) {
    const value=upstream.getPropertyValue(name).trim();
    if(value)appDoc.documentElement.style.setProperty(name,value);
  }
  appDoc.documentElement.style.cssText += ';color-scheme:light;';
  appDoc.body.style.margin='0';
  const mount = appDoc.createElement('div');
  mount.id='kalenderprofile-app';
  appDoc.body.appendChild(mount);
  const shadow = mount.attachShadow({ mode: 'open' });
  const style = document.createElement('style');
  style.textContent = `:host{all:initial;font:14px/1.45 system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif} *,*::before,*::after{box-sizing:border-box} .shade{position:fixed;inset:0;z-index:2147483646} .panel{position:fixed;border:1px solid #ccd6df;box-shadow:0 16px 52px rgba(0,0,0,.24);z-index:2147483647;display:flex;flex-direction:column;overflow:hidden} .head{border-bottom:1px solid #dce5ed;display:flex;justify-content:space-between;gap:12px;align-items:start} h2{margin:0 0 2px;line-height:1.25}.subtitle,.hint{font-size:12px;color:#566676} .scroll{display:flex;flex-direction:column;overflow:auto;overscroll-behavior:contain} select,input[type="search"]{width:100%;font:inherit;border:1px solid #aab8c5;border-radius:8px;background:#fff;padding:9px;color:#172b40} .actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px} button{font:inherit;cursor:pointer;line-height:1.2;border:1px solid #aab8c5;border-radius:8px;padding:9px 11px;color:#183349;background:#fff;min-height:36px} button:hover{background:#ecf5fa}button:focus-visible,select:focus-visible,input:focus-visible{outline:2px solid #0079bd;outline-offset:2px} button.primary{font-weight:700}button.primary:hover{background:#005386} button.close{border:0;background:transparent;font-size:23px;padding:0 8px;min-height:28px} button:disabled{opacity:.45;cursor:default} .info{border-radius:8px} .warning{background:#fff7e5;color:#654400;border:1px solid #e9d3a0;border-radius:8px;margin-top:10px} .dimension{margin-top:8px}.dimension-title{display:flex;align-items:center;gap:8px}.dimension-title strong{font-size:12px}.dimension-title button{padding:3px 7px;min-height:24px;font-size:11px} .checks{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:5px}.check{display:flex;gap:7px;align-items:center;min-height:27px;font-size:12px;padding:4px 6px;border:1px solid #e0e7ed;cursor:pointer}.check input{accent-color:#0068a6;flex-shrink:0}.check:hover{background:#f2f8fb}.extra{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}.extra .check{min-width:0}.extra small{color:#65798a;white-space:nowrap}.item-meta{display:block;font-size:11px;color:#65798a;margin-top:2px}.item-name{display:block} .sort-preview{flex:1;border:1px solid #d7e0e9;border-radius:9px;padding:8px;overflow-y:auto;margin:8px 0} .sort-group{font-size:12px;font-weight:750;color:#425668;margin:9px 0 5px} .sort-row{display:flex;gap:6px;padding:4px 5px;font-size:12px;align-items:center;border-bottom:1px solid #edf1f4;min-height:37px}.sort-row[draggable=true]{cursor:grab}.sort-row.dragover{outline:2px dashed #2384bc;outline-offset:-2px}.sort-row button{min-height:24px;padding:3px 7px;font-size:12px}.sort-row button:disabled{opacity:.3}.sort-label{flex:1;min-width:0;overflow-wrap:anywhere}.sort-btn{flex-shrink:0}.refresh-btn{background:#e8f7ed;color:#145633;border-color:#93d0a5}.sort-preview{min-height:250px} .sort-num{width:24px;text-align:right;color:#697c89;font-variant-numeric:tabular-nums;flex-shrink:0} .sort-picked{font-weight:700;color:#0068a6} .selection-title{display:flex;gap:12px;align-items:center;justify-content:space-between;margin:16px 0 8px} .selection-title strong{font-size:14px}.count{font-size:12px;color:#52687b;white-space:nowrap} .list{flex:1;min-height:170px;margin-top:8px;border:1px solid #d7e0e9;border-radius:9px;overflow-y:auto;padding:3px} .item{display:flex;align-items:flex-start;gap:9px;padding:7px 8px;cursor:pointer;border-radius:6px;word-break:break-word}.item:hover{background:#f5f8fa} .item input{width:17px;height:17px;accent-color:#0068a6;flex-shrink:0;margin-top:2px}.item.ambiguous{color:#7e6670;cursor:not-allowed} .foot{border-top:1px solid #dce5ed;display:flex;justify-content:space-between} .status{font-size:12px;min-height:15px;color:#33556c;flex:1 1 140px;max-height:58px;overflow:auto} .tabs{display:flex;border-bottom:1px solid #dee7ec} .tabs button{border:0;background:transparent} .panel.sort-tab .profile-top,.panel.individual-tab .profile-top{display:none!important} .panel.sort-tab .scroll{overflow:hidden} .mini{font-size:12px;color:#596d7d;margin:4px 0 9px} .summary{padding:8px 10px;border:1px solid #d3e6ef;border-radius:8px;font-size:12px} .toolbar{display:flex;align-items:center;gap:5px;justify-content:space-between} .toolbar button{padding:5px 7px;font-size:11px;min-height:29px} .compact-info{font-size:11px;color:#607484;margin-top:8px} .tab-panel[data-panel='individual'],.tab-panel[data-panel='sorting']{display:flex;flex-direction:column} .tab-panel[hidden]{display:none!important}.tabs{padding-top:3px} .info{margin-top:7px}.actions{margin-top:7px}.selection-title{margin-top:7px} @media(max-width:700px){.checks,.extra{grid-template-columns:repeat(2,minmax(0,1fr))}} @media(max-width:460px){.checks,.extra{grid-template-columns:1fr 1fr}} .info{font-size:11px;padding:7px 8px} .warning{font-size:11px;padding:7px} #sort-apply{width:100%} input:indeterminate{accent-color:#b67c07} @media(max-width:500px){.scroll{padding:8px 10px}.foot{padding:8px}} :host{color-scheme:light dark;color:var(--color-main-text,#273744)} .shade{background:rgba(15,25,36,.28)} .panel{background:var(--color-main-background,#fff);border-color:var(--color-border,#d3dce4);border-radius:var(--border-radius-large,12px)} .head{background:var(--color-main-background,#fff);border-color:var(--color-border,#d9e2e8);padding:13px 18px 11px} h2{color:var(--color-main-text,#243849);font-size:20px;font-weight:700} .subtitle,.mini,.hint,.compact-info,.count,.item-meta,.status{color:var(--color-text-maxcontrast,#647686)} .tabs{padding:0 14px;background:var(--color-main-background,#fff);border-color:var(--color-border,#dde5eb);gap:1px} .tabs button{flex:0 1 auto;padding:12px 15px;min-height:43px;border-radius:0;border-bottom:3px solid transparent;color:var(--color-text-maxcontrast,#596d7c);font-weight:600} .tabs button[aria-selected='true']{background:transparent;color:var(--color-primary-element,#0082c9);border-bottom-color:var(--color-primary-element,#0082c9);box-shadow:none} .tabs button:hover{background:var(--color-background-hover,#f3f6f8)} .scroll{padding:12px 18px 14px} .foot{background:var(--color-main-background,#fff);border-color:var(--color-border,#dce5ed)} button,select,input[type='search']{border-radius:var(--border-radius-element,8px);border-color:var(--color-border-dark,#c2cdd6);background:var(--color-main-background,#fff);color:var(--color-main-text,#223b4e);min-height:36px} button:hover,.check:hover,.item:hover{background:var(--color-background-hover,#edf5fa)} button.primary{background:var(--color-primary-element,#0082c9);border-color:var(--color-primary-element,#0082c9);color:var(--color-primary-element-text,#fff)} .dimension,.profile-section{background:var(--color-main-background,#fff);border:1px solid var(--color-border,#e2e7ec);border-radius:10px;padding:10px 12px;margin-top:10px} .dimension-title{justify-content:space-between;margin-bottom:9px} .dimension-title strong,.section-title{font-size:13px;font-weight:650} .dimension-actions{display:flex;gap:5px;margin-left:auto;align-items:center;justify-content:flex-end} .dimension-title .dimension-actions button{padding:4px 10px;min-height:29px;font-size:12px} .check{border-color:var(--color-border,#e1e7ec);background:var(--color-main-background,#fff);border-radius:7px} input[type='checkbox']{accent-color:var(--color-primary-element,#0082c9)} .profile-top{display:grid} .profile-top > .summary-line{grid-column:1 / -1} .summary-line{display:flex;gap:8px;align-items:center;min-width:0} .summary-line .summary{flex:1;min-width:0} .summary-line button{font-size:12px;flex-shrink:0;min-height:34px} @media(max-width:730px){.profile-top{display:flex;flex-direction:column}.profile-top > .summary-line{grid-column:auto}.summary-line{flex-wrap:wrap}.summary-line .summary{flex-basis:100%}} .profile-section{margin-top:0;padding:10px 12px} .profile-section .section-title{display:block;margin-bottom:7px} .profile-tools{display:flex;align-items:center;gap:6px;margin-left:auto} .profile-tools button{font-size:12px;min-height:29px;padding:5px 10px} .profile-section .toolbar{margin-bottom:6px} .summary{background:var(--color-background-hover,#f1f7fa);border-color:var(--color-border,#d4e4ec);margin-top:0} .info,.warning{border-radius:var(--border-radius-element,8px)} .info{background:var(--color-background-hover,#f2f6f8)} details.help{margin-top:7px;padding:6px 9px}details.help summary{cursor:pointer;color:var(--color-text-maxcontrast,#566979);font-size:12px}details.help[open] summary{margin-bottom:5px} .sort-preview,.list{border-color:var(--color-border,#d7e0e9);background:var(--color-main-background,#fff)} .sort-row.pinned{background:var(--color-background-hover,#edf5fa)} .check.unavailable{opacity:.46;cursor:not-allowed;background:var(--color-background-dark,#f1f2f3)} .check.unavailable:hover{background:var(--color-background-dark,#f1f2f3)} .check.unavailable input{cursor:not-allowed} select option:disabled{color:#8b99a5} .tab-panel[data-panel='individual'] .profile-section{margin:5px 0 7px} .tab-panel[data-panel='individual'] .summary-line{margin:5px 0 8px} @media(max-width:700px){.panel{right:8px;top:8px;width:calc(100vw - 16px);height:calc(100dvh - 16px);max-height:calc(100dvh - 16px)}.tabs button{padding:9px 9px;font-size:12px}} .profile-top .profile-section{padding-bottom:9px} .scroll{padding-top:8px;padding-bottom:10px} .tab-panel[data-panel='profiles'] .dimension{padding-top:7px;padding-bottom:7px;margin-top:7px} .tab-panel[data-panel='profiles'] .dimension-title{margin-bottom:5px;min-height:27px} .tab-panel[data-panel='profiles'] .check{min-height:25px;padding-top:3px;padding-bottom:3px} .warning-details{margin:5px 0;border:1px solid var(--color-border,#d6dce2);border-radius:7px;background:var(--color-background-hover,#f6f8fa);font-size:11px} .warning-details summary{cursor:pointer;padding:5px 9px;color:var(--color-text-maxcontrast,#586878)} .warning-details .warning{white-space:normal;margin:4px 6px 6px} .toolbar,.dimension-title,.selection-title,.preview-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;min-height:30px;margin:0 0 6px} .toolbar .section-title,.dimension-title strong,.selection-title strong,.preview-heading strong{font-size:13px;font-weight:650;line-height:1.4;margin:0} .profile-section .toolbar,.dimension-title{margin-bottom:6px} .check{min-width:0}.check>span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap} .check .filter-count,.extra small{font-size:11px;font-weight:400;color:var(--color-text-maxcontrast,#65798a);white-space:nowrap;flex:none} .check.unavailable .filter-count{color:inherit} .dimension-title .dimension-actions button,.profile-tools button{min-height:29px;padding:4px 10px;font-size:12px} .visibility-preview{flex:none;min-height:0;overflow:hidden;margin-top:9px;padding:8px 11px;border:1px solid var(--color-border,#e2e7ec);border-radius:10px;background:var(--color-main-background,#fff)} .visibility-preview[hidden]{display:none!important} .preview-heading{margin-bottom:4px;min-height:22px}.preview-heading span{font-size:11px;color:var(--color-text-maxcontrast,#647686)} .preview-columns{display:grid;grid-template-columns:1fr 1fr;gap:8px;min-height:0;height:calc(100% - 26px)} .preview-column{min-width:0;overflow:hidden;display:flex;flex-direction:column;background:var(--color-background-hover,#f7f9fb);border-radius:7px;padding:5px 8px} .preview-label{display:flex;justify-content:space-between;gap:6px;align-items:center;font-size:11px;margin-bottom:3px} .preview-label span{color:var(--color-text-maxcontrast,#647686);font-variant-numeric:tabular-nums} .preview-entry{font-size:11px;line-height:18px;height:18px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis} .panel.preview-fit .scroll{overflow:hidden} @media(max-width:730px){.panel.preview-fit .scroll{overflow:auto}} @media(max-width:500px){.preview-columns{grid-template-columns:1fr 1fr}.preview-column{padding:3px 5px}} .panel{top:14px;right:14px;width:min(860px,calc(100vw - 28px));height:min(calc(100dvh - 28px),max(85dvh,1020px));max-height:calc(100dvh - 28px)} .scroll{flex:1 1 0;min-height:0;overflow-y:auto;overflow-x:hidden} .panel.sort-tab .scroll{overflow-y:auto} .foot{align-content:center} .tab-panel[data-panel='profiles']{display:block;flex:0 0 auto;min-height:0} .tab-panel[data-panel='individual'],.tab-panel[data-panel='sorting']{flex:1 1 0;min-height:0} .panel.sort-tab .sort-preview{flex:1 1 0} .profile-top{grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;align-items:start;flex:0 0 auto} .panel.individual-tab [data-panel="individual"] .profile-top,.panel.sort-tab [data-panel="sorting"] .profile-top{display:grid!important} .profile-top .profile-section{margin:0;padding:10px 12px;min-width:0} .profile-top .toolbar{height:32px;min-height:32px;margin:0 0 7px} .profile-top .toolbar .section-title{margin:0;font-size:13px;line-height:1.4} .profile-top .profile-tools{display:flex;gap:5px;margin-left:auto;white-space:nowrap} .profile-top .profile-tools button{min-height:29px;padding:4px 9px;font-size:12px} .profile-top .profile-section>select{width:100%;height:38px;min-height:38px;margin:0;padding:7px 9px} .profile-top .summary-line{grid-column:1/-1;min-width:0;margin:0} .tab-panel[data-panel='individual']>.profile-top>.profile-section{margin:0} .tab-panel[data-panel='individual']>.profile-top>.summary-line{margin:0} .sort-explanation{margin:10px 0 4px;font-size:12px;color:var(--color-text-maxcontrast,#647686)} .preview-entries{flex:1 1 0;min-height:0;overflow:hidden;overscroll-behavior:contain} .preview-entries.expanded{overflow-y:auto;overflow-x:hidden} .preview-more{display:block;width:100%;text-align:left;padding:0 1px;min-height:18px;border:0;background:transparent;line-height:18px;font-size:11px;font-weight:650;color:var(--color-primary-element,#0082c9);cursor:pointer;border-radius:3px} .preview-more:hover{background:var(--color-background-hover,#eaf3fa);text-decoration:underline} @media(max-width:730px){.panel{top:8px;right:8px;width:calc(100vw - 16px);height:calc(100dvh - 16px);max-height:calc(100dvh - 16px)}.profile-top{grid-template-columns:1fr}.profile-top .profile-section{margin:0}.profile-top .profile-section>select{width:100%}} @media(max-width:460px){.panel{left:7px;right:7px;top:7px;width:calc(100vw - 14px);height:calc(100dvh - 14px);max-height:calc(100dvh - 14px)}} .foot{height:64px;min-height:64px;max-height:64px;flex:0 0 64px;flex-wrap:nowrap;align-items:center;gap:10px;overflow:hidden;padding:7px 16px} .foot .status{display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;line-clamp:2;max-height:34px;min-height:0;flex:1 1 0;min-width:0;overflow:hidden;text-overflow:ellipsis;line-height:17px;overflow-wrap:anywhere} .foot-controls{display:flex;align-items:center;justify-content:flex-end;gap:7px;flex:0 0 auto;min-width:0} .foot-controls button{width:auto;min-height:34px;flex-shrink:0;padding:6px 10px;white-space:nowrap} .foot-controls button[hidden]{display:none!important} .panel:not(.sort-tab) #sort-apply,.panel:not(.sort-tab) #sort-refresh-page{display:none!important} .panel.sort-tab #apply{display:none!important} .panel.sort-tab #sort-apply{width:auto} .panel.setup-tab-active #apply{display:none!important} .tab-panel[data-panel='setup']{display:block;flex:0 0 auto} .setup-note{font-size:12px;line-height:1.5;color:var(--color-text-maxcontrast,#647686);margin:8px 0 0} .setup-actions{display:flex;flex-wrap:wrap;gap:9px;margin-top:13px} .always-list{height:240px;max-height:30dvh;overflow-y:auto;overscroll-behavior:contain;display:grid;grid-template-columns:1fr;align-content:start;gap:4px;padding:5px;border:1px solid var(--color-border,#d4dce5);border-radius:8px;margin-top:7px} .always-item{display:flex;align-items:center;gap:5px;min-width:0;min-height:28px;padding:3px 5px;border-radius:5px;font-size:11px;cursor:pointer} .always-item:hover{background:var(--color-background-hover,#f0f5f9)}.always-item input{flex-shrink:0;accent-color:var(--color-primary-element,#0082c9)} .always-item span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;min-width:0;flex:1}.always-item small{color:var(--color-text-maxcontrast,#647686);white-space:nowrap;font-size:10px;max-width:110px;overflow:hidden;text-overflow:ellipsis}.always-item.unavailable{opacity:.5;cursor:not-allowed} .always-mark{font-size:10px;font-weight:600;color:var(--color-primary-element,#0082c9)} @media(max-width:500px){.always-list{grid-template-columns:1fr;height:180px}} .panel.sort-tab .sort-preview{min-height:125px;margin-bottom:3px} @media(max-width:730px){.foot{padding:5px 10px;display:grid;grid-template-columns:minmax(0,1fr);grid-template-rows:18px 34px;align-content:center;gap:1px}.foot .status{font-size:11px;max-height:18px;line-height:18px;white-space:nowrap;display:block}.foot-controls{justify-content:flex-end;gap:6px}.foot-controls button{font-size:11px;min-height:30px;padding:5px 8px}} @media(max-width:390px){.foot-controls button{font-size:10px;padding-inline:5px}} .setup-columns{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);gap:10px;align-items:start}.setup-left{display:flex;flex-direction:column;gap:10px;min-width:0}.setup-columns .profile-section{margin:0;min-width:0}.setup-always .always-list{height:260px;max-height:32dvh}.setup-backup .setup-actions button{flex:1;min-width:145px}.quick-editor-grid{display:grid;grid-template-columns:minmax(180px,0.38fr) minmax(0,1fr);gap:14px}.quick-sidebar,.quick-form{min-width:0}.quick-sidebar>select{height:260px;width:100%;margin-top:6px;padding:4px}.quick-sidebar option{padding:5px;white-space:normal}.quick-form>input[type=text]{width:100%;font:inherit;border:1px solid var(--color-border-dark,#c2cdd6);background:var(--color-main-background,#fff);color:var(--color-main-text,#223b4e);padding:8px;border-radius:7px;margin:5px 0 10px}.quick-fields{display:grid;grid-template-columns:1fr 1fr;gap:8px}.quick-fields label,.quick-form .quick-config>label{font-size:12px;display:block;margin-bottom:4px}.quick-toggle{font-size:12px;display:flex;align-items:center;gap:6px;margin:12px 0}.quick-config{border:1px solid var(--color-border,#d7e0e9);border-radius:8px;padding:9px;margin-top:7px}.quick-config[hidden]{display:none!important}.quick-config>strong{display:block;font-size:12px;margin:5px 0}.quick-checks{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3px}.quick-checks label,.quick-key-list label{display:flex;align-items:center;gap:5px;font-size:11px;min-width:0;padding:3px}.quick-checks label span,.quick-key-list label span{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.quick-key-list{max-height:180px;overflow:auto;border:1px solid var(--color-border,#d7e0e9);border-radius:6px;margin-top:6px;padding:4px}.quick-buttons{margin-top:12px}.quick-buttons button{font-size:12px}.quick-editor .setup-note{margin-top:6px} .quick-sidebar>select#quick-view-list{margin-top:6px;font-size:11px;line-height:1.35;padding:4px}.quick-sidebar #quick-view-list option{padding:3px 5px}.quick-sidebar #quick-view-search{margin-top:6px;padding:7px;font-size:12px}.quick-category-editor{border:1px solid var(--color-border,#d7e0e9);border-radius:8px;padding:10px;margin-top:14px;display:flex;flex-direction:column;gap:5px}.quick-category-editor>select{height:105px;min-height:80px;font-size:11px;padding:3px}.quick-category-editor>select option{padding:3px 5px}.quick-category-editor>input{width:100%;min-height:32px;padding:6px 8px;border:1px solid var(--color-border-dark,#b5c0cc);border-radius:7px;font:inherit;font-size:12px;background:var(--color-main-background,#fff);color:var(--color-main-text,#223b4e)}.quick-category-editor .category-actions{display:flex;flex-wrap:wrap;gap:5px}.category-actions button{font-size:11px;padding:6px 7px;min-height:30px;flex:1}.quick-option{font-size:11px;display:flex;align-items:center;gap:6px;margin:9px 0 3px}.quick-option input{accent-color:var(--color-primary-element,#0082c9)} @media(max-width:730px){.setup-columns,.quick-editor-grid{grid-template-columns:1fr}.setup-always .always-list{height:180px}.quick-sidebar>select{height:160px}.quick-fields{grid-template-columns:1fr}} .quick-list-actions{gap:5px;flex-wrap:nowrap;margin-top:7px}.quick-list-actions button{min-height:29px;padding:4px 7px;font-size:11px}.quick-list-actions #quick-new{flex:1;text-align:left;min-width:0}.quick-list-actions #quick-up,.quick-list-actions #quick-down{flex:0 0 30px;padding:3px}.quick-category-order{display:flex;gap:5px}.quick-category-order button{flex:1;min-height:27px;padding:3px 8px;font-size:12px}.quick-category-order button:disabled{opacity:.35}
/* V1.2.5: Setup rechts; kompakte Kategorieaktionen; Vorschau mit eigenem Scrollbereich */
.tabs .setup-nav{margin-left:auto;background:#697584;color:#fff;border:1px solid #697584;border-radius:7px;padding:7px 15px;min-height:32px;align-self:center;font-size:12px;flex:0 0 auto}
.tabs .setup-nav:hover{background:#576573;color:#fff}
.tabs .setup-nav[aria-selected='true']{background:#495766;color:#fff;border:1px solid #495766;box-shadow:none}
.preview-entries{overflow-y:auto;overflow-x:hidden}
.panel.preview-fit .scroll{overflow-y:auto}
@media(max-width:480px){.tabs{padding:0 5px}.tabs button{padding:8px 6px;font-size:11px}.tabs .setup-nav{padding:6px 9px;font-size:11px}}

.classification-grid{display:grid;grid-template-columns:minmax(175px,.36fr) minmax(0,1fr);gap:14px;margin-top:10px}
.classification-sidebar,.classification-form{min-width:0;display:flex;flex-direction:column;gap:6px}
.classification-sidebar select,.classification-form input,.classification-form textarea{width:100%;min-width:0;background:var(--color-main-background,#fff);color:var(--color-main-text,#243849);border:1px solid var(--color-border-dark,#b9c5d0);border-radius:7px;padding:7px 8px;font:inherit;font-size:12px}
.classification-sidebar #classification-list{height:205px;padding:4px;font-size:12px}
.classification-sidebar #classification-list option{padding:4px}
.classification-form textarea{resize:vertical;min-height:58px;line-height:1.45}
.classification-form input:disabled{opacity:.65}
.classification-form input[aria-invalid="true"]{border-color:#bf2c2c;outline:2px solid rgba(191,44,44,.18)}
.classification-form .section-title,.classification-sidebar .section-title{font-size:12px;margin-top:7px}
.classification-form .setup-note{margin:0 0 4px}
.classification-actions{gap:5px;flex-wrap:nowrap;margin-top:3px}
.classification-actions button{font-size:11px;min-height:30px;padding:5px 7px;flex:0 1 auto}
.classification-actions #classification-new{flex:1}
.classification-footer{margin-top:8px}
.classification-detected{border:1px solid var(--color-border,#d3dce4);border-radius:7px;padding:8px;display:flex;flex-direction:column;gap:7px;margin-top:12px}
.classification-detected[hidden]{display:none!important}
.classification-detected button{font-size:12px;padding:6px}
.classification-editor .dimension-title{margin-bottom:3px}
.classification-editor .dimension-title .setup-note{margin:0}
@media(max-width:730px){.classification-grid{grid-template-columns:1fr}.classification-sidebar #classification-list{height:130px}}
/* Setup sections deliberately share one navigation level; no category editor nested in quick views. */
.setup-subtabs{display:flex;flex-wrap:wrap;gap:6px;padding:7px 0 11px;border-bottom:1px solid var(--color-border,#dce5ed);margin-bottom:9px;position:sticky;top:-8px;z-index:3;background:var(--color-main-background,#fff)}
.setup-subtabs button{min-height:34px;border-radius:7px;border:1px solid var(--color-border,#d3dce4);padding:6px 12px;font-size:12px;font-weight:600}
.setup-subtabs button[aria-selected="true"]{background:var(--color-primary-element,#0082c9);border-color:var(--color-primary-element,#0082c9);color:var(--color-primary-element-text,#fff)}
.setup-subpanel[hidden]{display:none!important}
.setup-intro{color:var(--color-text-maxcontrast,#667684);font-size:12px;line-height:1.5;margin:5px 0 14px}
.setup-subpanel > .dimension{margin-top:0}
.setup-subpanel[data-setup-panel="general"] .setup-columns{grid-template-columns:1fr 1fr}
.setup-subpanel[data-setup-panel="general"] .setup-always .always-list{height:290px;max-height:45dvh}
@media(max-width:730px){.setup-subtabs{top:-8px}.setup-subtabs button{font-size:11px;padding:6px 8px}.setup-subpanel[data-setup-panel="general"] .setup-columns{grid-template-columns:1fr}}


/* Shared setup layout: stable tab dimensions, uniform controls and two-column editors. */
.panel.setup-tab-active .scroll{overflow-y:scroll;scrollbar-gutter:stable}
.setup-tab .setup-subtabs{display:grid;grid-template-columns:repeat(6,minmax(0,1fr));gap:5px;align-items:stretch;position:sticky;top:-12px;padding:10px 0;min-height:63px}
.setup-tab .setup-subtabs button{width:100%;min-width:0;min-height:39px;padding:7px 5px;font-size:11px;line-height:1.3;white-space:normal}
.setup-tab .setup-subpanel{min-height:510px}
.setup-tab .setup-subpanel>.dimension,.setup-tab .setup-subpanel>.profile-section{width:100%;max-width:none}
.setup-tab .classification-grid,.setup-tab .quick-editor-grid{grid-template-columns:minmax(195px,36%) minmax(0,1fr);gap:14px}
.setup-tab .classification-sidebar,.setup-tab .classification-form{min-width:0}
.setup-tab .classification-sidebar select,.setup-tab .classification-form input:not([type=checkbox]),.setup-tab .classification-form textarea,.setup-tab .classification-form select,.setup-tab .quick-sidebar select,.setup-tab .quick-sidebar input,.setup-tab .quick-form select,.setup-tab .quick-form input:not([type=checkbox]){width:100%;max-width:none;font-size:12px;box-sizing:border-box}
.setup-tab input:not([type=checkbox]):not([type=file]),.setup-tab select:not([size]),.setup-tab button{min-height:36px}
.setup-tab select[size]{height:210px;min-height:210px;max-width:none}
.setup-tab .setup-actions{display:flex;gap:6px;align-items:stretch;flex-wrap:wrap}
.setup-tab .setup-actions button{min-width:36px;padding:6px 11px;font-size:12px;line-height:1.25}
.setup-tab .classification-actions{display:flex;gap:6px;flex-wrap:nowrap}
.setup-tab .classification-actions button{flex:0 1 auto}
.setup-tab .classification-actions button:first-child{min-width:36px}

.setup-tab .category-management .category-actions{display:flex;gap:6px;max-width:none;margin:0}
.setup-tab .category-management .category-actions button{font-size:12px;min-height:36px;padding:6px 11px;flex:0 1 auto}
.setup-tab .category-management #quick-category-list{height:210px;max-width:none;font-size:12px}
.setup-tab .category-management #quick-category-name{height:36px;max-width:none;font-size:12px}
/* Shared contextual setup footer: one stable row, only active tab's actions visible. */
.foot-controls .setup-footer-actions{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap;justify-content:flex-end}
.foot-controls .setup-footer-actions[hidden]{display:none!important}
.panel.setup-tab-active .foot-controls{max-width:100%;min-width:0}
.panel.setup-tab-active .foot-controls button{min-height:34px}
.setup-common-calendars{margin-top:12px!important;background:var(--color-background-hover,#f7f9fb)!important}
.setup-common-calendars .setup-common-grid{display:grid;grid-template-columns:minmax(190px,36%) minmax(0,1fr);gap:14px;align-items:start;margin-top:10px}
.setup-common-calendars textarea{box-sizing:border-box;width:100%;min-height:85px;max-width:100%;padding:8px;border:1px solid var(--color-border-dark,#b9c5d0);border-radius:var(--border-radius-element,8px);background:var(--color-main-background,#fff);color:var(--color-main-text,#243849);font:inherit;font-size:12px;line-height:1.45;resize:vertical}
.setup-common-calendars .setup-note{margin-top:4px}
.setup-category-create-hint{font-weight:600;color:var(--color-primary-element,#0082c9)!important}
@media(max-width:730px){.setup-common-calendars .setup-common-grid{grid-template-columns:1fr}.panel.setup-tab-active .foot{min-height:73px;height:auto}.panel.setup-tab-active .foot-controls{overflow-x:auto;justify-content:flex-start;max-width:100%}.panel.setup-tab-active .foot-controls button{font-size:11px;white-space:nowrap}}

/* Compact, non-destructive multiselect list filters below the individual search. */
.individual-quick{margin-top:8px}
.individual-quick-controls{display:grid;grid-template-columns:repeat(3,minmax(0,1fr)) auto;align-items:start;gap:7px}
.individual-filter{position:relative;min-width:0}
.individual-filter summary{list-style:none;cursor:pointer;border:1px solid var(--color-border-dark,#b9c5d0);border-radius:7px;padding:8px 10px;min-height:35px;font-size:12px;background:var(--color-main-background,#fff);display:flex;align-items:center;justify-content:space-between;gap:7px;user-select:none}
.individual-filter summary::-webkit-details-marker{display:none}
.individual-filter summary::after{content:'▾';font-size:13px;flex-shrink:0;color:var(--color-text-maxcontrast,#607585)}
.individual-filter[open] summary::after{content:'▴'}
.individual-filter.active summary{border-color:var(--color-primary-element,#0082c9);color:var(--color-primary-element,#006ba5);font-weight:650;background:var(--color-background-hover,#f2f8fc)}
.individual-filter summary:focus-visible{outline:2px solid var(--color-primary-element,#0082c9);outline-offset:2px}
.individual-filter-popover{position:absolute;z-index:15;top:calc(100% + 5px);left:0;width:max(100%,240px);max-width:min(330px,83vw);border-radius:8px;border:1px solid var(--color-border,#c9d4dd);box-shadow:0 9px 22px rgba(0,0,0,.18);background:var(--color-main-background,#fff);padding:6px}
.individual-filter:nth-child(3) .individual-filter-popover{left:auto;right:0}
.individual-filter-options{max-height:215px;overflow-y:auto;overscroll-behavior:contain;display:flex;flex-direction:column;gap:2px}
.individual-filter-option{display:flex;align-items:center;gap:8px;padding:6px 7px;font-size:12px;min-height:30px;border-radius:5px;cursor:pointer}
.individual-filter-option:hover{background:var(--color-background-hover,#f2f7fb)}
.individual-filter-option input{flex-shrink:0;accent-color:var(--color-primary-element,#0082c9)}
.individual-filter-option span{flex:1;min-width:0;overflow-wrap:anywhere}
.individual-filter-option small{color:var(--color-text-maxcontrast,#65798a);font-variant-numeric:tabular-nums}
.individual-filter-clear{width:100%;margin-top:5px;padding:6px 8px;min-height:31px;font-size:11px}
#individual-filters-reset{padding:8px 10px;min-height:35px;font-size:11px;white-space:nowrap}
.individual-filter-hint{font-size:11px;color:var(--color-text-maxcontrast,#63798a);margin:5px 0 1px}
.individual-list-actions{display:flex;justify-content:flex-end;gap:8px;flex-wrap:wrap;margin-top:9px}
.individual-list-actions button{font-size:12px;min-height:36px;min-width:156px}
.individual-list-actions #individual-toggle-visible{background:var(--color-primary-element,#0082c9);border-color:var(--color-primary-element,#0082c9);color:var(--color-primary-element-text,#fff)}
.individual-list-actions #individual-toggle-visible:hover{filter:brightness(.94)}
.individual-list-note{font-size:11px;color:var(--color-text-maxcontrast,#63798a);margin-top:5px;line-height:1.4}
@media(max-width:560px){.individual-list-actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.individual-list-actions button{min-width:0}}
@media(max-width:650px){.individual-quick-controls{grid-template-columns:repeat(2,minmax(0,1fr))}.individual-filter-popover{max-width:min(260px,85vw)}}

.setup-members{border:1px solid var(--color-border,#d3dce4);border-radius:7px;min-height:90px;max-height:210px;overflow:auto;padding:8px;font-size:12px;line-height:1.7}
.setup-members>div{border-bottom:1px solid var(--color-border,#e1e7ed)}
.setup-tab .setup-intro{min-height:34px;margin:6px 0 10px}
@media(max-width:730px){.setup-tab .setup-subtabs{grid-template-columns:repeat(3,minmax(0,1fr));min-height:100px}.setup-tab .classification-grid,.setup-tab .quick-editor-grid,.setup-tab .category-management .quick-category-editor{grid-template-columns:1fr}.setup-tab .setup-subpanel{min-height:480px}.setup-tab select[size]{height:145px;min-height:145px}}

`;
  shadow.appendChild(style);
  const shade = document.createElement('div'); shade.className = 'shade'; shadow.appendChild(shade);
  const panel = document.createElement('section'); panel.className = 'panel';
  panel.setAttribute('role', 'dialog'); panel.setAttribute('aria-modal', 'true');
  panel.setAttribute('aria-label', 'Kalenderprofile'); shadow.appendChild(panel);
  panel.innerHTML = `
    <div class="head"><div><h2>Kalenderprofile</h2><div class="subtitle">Kalenderverwaltung für Nextcloud · V${VERSION}</div></div><button class="close" id="close" title="Schließen" aria-label="Schließen">×</button></div>
    <div class="tabs" role="tablist" aria-label="Arbeitsbereich"><button data-tab="profiles" role="tab" aria-selected="true">Profile & Filter</button><button data-tab="individual" role="tab" aria-selected="false">Einzelauswahl</button><button data-tab="sorting" role="tab" aria-selected="false">Sortierung</button><button data-tab="setup" class="setup-nav" role="tab" aria-selected="false">Setup</button></div>
    <div class="scroll">
      <div class="tab-panel" data-panel="profiles">
      <div class="profile-top">
        <div class="profile-section">
          <div class="toolbar"><label class="section-title" for="presets">Schnellansichten</label><div class="profile-tools"><button id="all" title="Alle Kalender anzeigen">Alle</button><button id="none" title="Alle Kalender ausblenden">Keine</button></div></div>
          <select id="presets" aria-label="Vordefinierte Schnellansicht"></select>
        </div>
        <div class="profile-section">
          <div class="toolbar"><label class="section-title" for="saved-profiles">Meine Profile</label><div class="profile-tools"><button id="save">Speichern</button></div></div>
          <select id="saved-profiles" aria-label="Gespeichertes Kalenderprofil"></select>
        </div>
        <div class="summary-line"><div class="summary" id="summary"></div><button id="reload" title="Häkchen aus der aktuellen Kalenderansicht übernehmen">Ansicht einlesen</button></div>
      </div>
        <div class="dimension"><div class="dimension-title"><strong>1. Bereiche</strong><div class="dimension-actions"><button type="button" id="areas-all">Alle</button><button type="button" id="areas-none">Keine</button></div></div><div id="areas" class="checks"></div></div>
        <div class="dimension"><div class="dimension-title"><strong>2. Kalenderarten</strong><div class="dimension-actions"><button type="button" id="types-all">Alle</button><button type="button" id="types-none">Keine</button></div></div><div id="types" class="checks"></div></div>
        <div class="dimension"><div class="dimension-title"><strong>3. Weitere Kalender</strong></div><div class="extra">
          <label class="check"><input id="include-common" type="checkbox">Allgemeine Kalender <small id="common-count"></small></label>
          <label class="check"><input id="include-personal" type="checkbox">Eigene Kalender <small id="personal-count"></small></label>
          <label class="check"><input id="include-shared" type="checkbox">Geteilte Kalender <small id="shared-count"></small></label>
          <label class="check"><input id="include-deck" type="checkbox">Deck <small id="deck-count"></small></label>
          <label class="check"><input id="include-tasks" type="checkbox">Aufgaben <small id="tasks-count"></small></label>
        </div></div>
        <details class="info help"><summary>Hinweise zur Filterlogik</summary><div id="note"></div></details><div id="warning"></div>
        <section class="visibility-preview" id="visibility-preview" aria-label="Vorschau der Kalenderanzeige" hidden>
          <div class="preview-heading"><strong>Vorschau der Kalenderauswahl</strong><span>Nach „Auswahl anwenden“</span></div>
          <div class="preview-columns">
            <div class="preview-column"><div class="preview-label"><strong>Angezeigt</strong><span id="preview-on-count"></span></div><div id="preview-on" class="preview-entries"></div></div>
            <div class="preview-column"><div class="preview-label"><strong>Ausgeblendet</strong><span id="preview-off-count"></span></div><div id="preview-off" class="preview-entries"></div></div>
          </div>
        </section>
      </div>
      <div class="tab-panel" data-panel="individual" hidden>
        <div class="profile-top">
          <div class="profile-section">
            <div class="toolbar"><label class="section-title" for="presets-individual">Schnellansichten</label><div class="profile-tools"><button id="all-individual" title="Alle Kalender anzeigen">Alle</button><button id="none-individual" title="Alle Kalender ausblenden">Keine</button></div></div>
            <select id="presets-individual" aria-label="Schnellansicht für Einzelauswahl"></select>
          </div>
          <div class="profile-section">
            <div class="toolbar"><label class="section-title" for="saved-profiles-individual">Meine Profile</label><div class="profile-tools"><button id="save-individual">Speichern</button></div></div>
            <select id="saved-profiles-individual" aria-label="Gespeichertes Profil für Einzelauswahl"></select>
          </div>
          <div class="summary-line"><div class="summary" id="individual-summary"></div><button id="reload-individual" title="Aktuelle Kalender aus der Nextcloud-Ansicht übernehmen">Ansicht einlesen</button></div>
        </div>
        <div class="selection-title"><strong>Einzelne Kalender auswählen</strong><span class="count" id="count"></span></div>
        <input id="search" type="search" placeholder="Kalender suchen …" aria-label="Kalender filtern" />
        <div class="individual-quick" aria-label="Schnellfilter für die Kalenderliste">
          <div class="individual-quick-controls">
            <details class="individual-filter" data-quick-filter="areas"><summary id="individual-areas-title">Bereiche</summary><div class="individual-filter-popover"><div id="individual-areas-options" class="individual-filter-options"></div><button type="button" id="individual-areas-reset" class="individual-filter-clear">Bereichsfilter aufheben</button></div></details>
            <details class="individual-filter" data-quick-filter="types"><summary id="individual-types-title">Kalenderarten</summary><div class="individual-filter-popover"><div id="individual-types-options" class="individual-filter-options"></div><button type="button" id="individual-types-reset" class="individual-filter-clear">Artfilter aufheben</button></div></details>
            <details class="individual-filter" data-quick-filter="extras"><summary id="individual-extras-title">Weitere Kalender</summary><div class="individual-filter-popover"><div id="individual-extras-options" class="individual-filter-options"></div><button type="button" id="individual-extras-reset" class="individual-filter-clear">Herkunftsfilter aufheben</button></div></details>
            <button type="button" id="individual-filters-reset" title="Suche und alle Schnellfilter zurücksetzen" disabled>Zurücksetzen</button>
          </div>
          <div class="individual-filter-hint">Mehrfachauswahl möglich · innerhalb eines Filters ODER, zwischen Filtern UND · nur Listenanzeige</div>
        </div>
        <div class="list" id="list"></div>
        <div class="individual-list-actions" aria-label="Aktionen für angezeigte Kalender">
          <button type="button" id="individual-release-fixed" title="Fixierung sichtbarer Kalender nur für diese Sitzung aussetzen (Setup bleibt unverändert)">Fixierung lösen</button>
          <button type="button" id="individual-toggle-visible" title="Nur angezeigte Kalender auswählen oder abwählen; fixierte Kalender bleiben aktiv">Alle angezeigten abwählen</button>
        </div>
        <div class="individual-list-note" id="individual-list-note">Die Schnellfilter ändern nur die Darstellung. Setup-Fixierungen bleiben aktiv.</div>
      </div>
      <div class="tab-panel" data-panel="sorting" hidden>
        <div class="profile-top sort-top">
          <div class="profile-section">
            <div class="toolbar"><label class="section-title" for="sort-mode">Sortiervorschläge</label><div class="profile-tools"><button id="sort-reset" type="button">Zurücksetzen</button></div></div>
            <select id="sort-mode" aria-label="Sortiervorschlag">
              <option value="original">Aktuelle Nextcloud-Reihenfolge</option>
              <option value="manual" disabled>Manuell angepasst</option>
              <option value="community">Vorschlag: Bereich → Art → Name</option>
              <option value="category">Vorschlag: Art → Bereich → Name</option>
              <option value="active">Aktive Kalender zuerst · Reihenfolge erhalten</option>
              <option value="selected">Ausgewählte Kalender zuerst · Reihenfolge erhalten</option>
              <option value="home">Mein bevorzugter Bereich zuerst</option>
              <option value="alphabet">Vorschlag: Alphabetisch</option>
            </select>
          </div>
          <div class="profile-section">
            <div class="toolbar"><label class="section-title" for="sort-sets">Meine Sortier-Sets</label><div class="profile-tools"><button id="sort-save-set">Speichern</button></div></div>
            <select id="sort-sets" aria-label="Sortier-Set"><option value="">— Sortier-Set auswählen —</option></select>
          </div>
        </div>
        <p class="mini sort-explanation">Kalender durch Ziehen oder ↑↓ innerhalb ihrer Nextcloud-Gruppe verschieben. Mit dem Schloss Positionen fixieren. Sortier-Sets bleiben lokal, bis du die neue Reihenfolge übernimmst.</p>
        <div class="sort-preview" id="sort-preview" aria-label="Manuelle Reihenfolge"></div>
        <div class="hint" id="sort-hint"></div>
        <div class="actions"><button id="sort-pin-always" type="button" title="Alle immer angezeigten Kalender fixieren oder ihre Positionen wieder freigeben">Immer angezeigte fixieren</button><button id="sort-copy" type="button">Reihenfolge kopieren</button><button id="sort-check" type="button">Kalenderzuordnung prüfen</button><button id="sort-restore" type="button">Letzte Sortierung rückgängig</button></div>
        <p class="compact-info">Fixierte Zeilen behalten ihre Position innerhalb des Bereichs bei automatischen Vorschlägen und beim Verschieben anderer Zeilen. Die CalDAV-Übernahme benötigt eine einmalige Prüfung und eine Bestätigung.</p>
      </div>
      <div class="tab-panel setup-tab" data-panel="setup" hidden>
        <nav class="setup-subtabs" role="tablist" aria-label="Setup-Bereiche">
          <button type="button" data-setup-tab="general" role="tab" aria-selected="true">Allgemein</button>
          <button type="button" data-setup-tab="classification" role="tab" aria-selected="false">Bereiche &amp; Arten</button>
          <button type="button" data-setup-tab="quick" role="tab" aria-selected="false">Schnellansichten</button>
          <button type="button" data-setup-tab="categories" role="tab" aria-selected="false">Kategorien</button>
          <button type="button" data-setup-tab="saved" role="tab" aria-selected="false">Profile &amp; Sortier-Sets</button>
          <button type="button" data-setup-tab="backup" role="tab" aria-selected="false">Sicherung</button>
        </nav>
        <div class="setup-subpanel" data-setup-panel="general">
          <p class="setup-intro">Persönliche Vorgaben für die Kalenderauswahl und Sortierung.</p>
        <div class="setup-columns">
          <div class="setup-left"><section class="profile-section">
            <div class="toolbar"><label class="section-title" for="preferred-area">Mein bevorzugter Bereich</label></div>
            <select id="preferred-area" aria-label="Bevorzugter Bereich für Sortierungen"><option value="">— Keinen bevorzugten Bereich festlegen —</option></select>
            <p class="setup-note">Wird bei „Mein bevorzugter Bereich zuerst“ und bei bereichsbezogenen Sortiervorschlägen berücksichtigt.</p>
          </section>
</div>
          <section class="profile-section setup-always">
            <div class="toolbar"><label class="section-title" for="always-visible-search">Immer angezeigte Kalender</label></div>
            <input id="always-visible-search" type="search" placeholder="Kalender suchen …" aria-label="Immer angezeigte Kalender suchen">
            <div id="always-visible-list" class="always-list" aria-label="Verfügbare Kalender für Immer-Anzeige"></div>
            <p class="setup-note" id="always-visible-note">Der eigene Standardkalender ist vorausgewählt. Weitere Kalender bleiben in jeder Ansicht eingeschaltet.</p>
          </section>
        </div>
        </div>
        <div class="setup-subpanel" data-setup-panel="classification" hidden>
          <p class="setup-intro">Bereiche und Kalenderarten verwalten, Erkennungsregeln pflegen und neue Bereiche vorschlagen lassen.</p>
        <section class="dimension classification-editor" aria-label="Bereiche und Kalenderarten konfigurieren">
          <div class="dimension-title"><strong>Bereiche &amp; Kalenderarten konfigurieren</strong><span class="setup-note">Eigene Bezeichnungen, Erkennungswörter und Reihenfolge</span></div>
          <div class="classification-grid">
            <div class="classification-sidebar">
              <label class="section-title" for="classification-kind">Konfiguration</label>
              <select id="classification-kind"><option value="areas">Bereiche</option><option value="types">Kalenderarten</option></select>
              <label class="section-title" for="classification-list">Vorhandene Einträge</label>
              <select id="classification-list" size="8" aria-label="Bereich oder Kalenderart zum Bearbeiten"></select>
              <div class="setup-actions classification-actions">
                <button id="classification-new" type="button">+ Neu</button>
                <button id="classification-up" type="button" aria-label="Eintrag nach oben verschieben" title="Nach oben">↑</button>
                <button id="classification-down" type="button" aria-label="Eintrag nach unten verschieben" title="Nach unten">↓</button>
                <button id="classification-delete" type="button">Löschen</button>
              </div>
              <div id="classification-detected" class="classification-detected">
                <label for="classification-detected-list" class="section-title">Vorschläge für neue Bereiche</label>
                <select id="classification-detected-list" aria-label="Vorgeschlagenen Bereich auswählen"></select>
                <div class="setup-actions classification-actions">
                  <button id="classification-adopt" type="button">Übernehmen</button>
                  <button id="classification-dismiss" type="button">Verwerfen</button>
                </div>
                <button id="classification-scan" type="button">Vorschläge ermitteln</button>
                <p class="setup-note" id="classification-proposal-note">Beim ersten Start einmalig ermittelt. Neue oder gelöschte Bereiche werden nur nach einem manuellen Suchlauf vorgeschlagen.</p>
              </div>
            </div>
            <div class="classification-form">
              <label class="section-title" for="classification-label">Bezeichnung</label>
              <input id="classification-label" type="text" maxlength="60" placeholder="z. B. Vertrieb">
              <label class="section-title" for="classification-id">Eindeutige Kennung</label>
              <input id="classification-id" type="text" maxlength="36" spellcheck="false" placeholder="z. B. sales" pattern="[a-z][a-z0-9_-]*">
              <p class="setup-note">Kennungen können geändert werden; betroffene Schnellansichten und Profile werden beim Speichern mit angepasst.</p>
              <label class="section-title" for="classification-keywords">Schlüsselwörter zur Erkennung</label>
              <textarea id="classification-keywords" rows="4" placeholder="Sales&#10;Vertrieb*&#10;&lt;Test*&gt;"></textarea>
              <p class="setup-note">Ein Suchwort pro Zeile. <code>su*wort</code> erlaubt beliebige Zeichen zwischen „su“ und „wort“; <code>&lt;intern&gt;</code> schließt Kalender mit „intern“ aus. Beides ist kombinierbar: <code>&lt;test*&gt;</code>. Mehrere positive Wörter gelten als ODER, Ausschlüsse haben Vorrang. Mindestens ein positives Wort ist nötig. Der erste passende Bereich bzw. die erste Art gewinnt. Unbekannte (KÜRZEL) werden nur als Vorschläge angeboten.</p>
              <p class="setup-note" id="classification-note" role="status" aria-live="polite"></p>
            </div>
          </div>
        </section>
        <section class="dimension setup-common-calendars" aria-label="Allgemeine Kalender unabhängig von Bereichen verwalten">
          <div class="dimension-title"><strong>Allgemeine Kalender</strong><span class="setup-note">Instanzweit verwendete Kalender erkennen</span></div>
          <div class="setup-common-grid">
            <div>
              <label class="section-title" for="classification-common">Schlüsselwörter zur Erkennung</label>
              <p class="setup-note">Beispielsweise Feiertage, Ferien oder gemeinsame Kalender. Diese Regeln gelten unabhängig von der oben gewählten Bereichs- oder Kalenderart.</p>
            </div>
            <div>
              <textarea id="classification-common" rows="3" placeholder="Feiertag*&#10;Geburtstag*&#10;&lt;privat*&gt;"></textarea>
              <p class="setup-note">Ein Muster pro Zeile. <code>*</code> ist ein Platzhalter, <code>&lt;Begriff&gt;</code> ein Ausschluss. Gespeichert wird gemeinsam mit den Bereichs- und Artenregeln über die Fußzeile.</p>
            </div>
          </div>
        </section>
        </div>
        <div class="setup-subpanel" data-setup-panel="quick" hidden>
          <p class="setup-intro">Schnellansichten bearbeiten und speichern. Die Organisation der Gruppen erfolgt im eigenen Reiter „Kategorien“.</p>
        <section class="dimension quick-editor">
          <div class="dimension-title"><strong>Schnellansichten konfigurieren</strong><span class="setup-note">Sichtbarkeit, Regeln und eigene Ansichten</span></div>
          <div class="quick-editor-grid">
            <div class="quick-sidebar">
              <label class="section-title" for="quick-view-list">Vorhandene Schnellansichten</label>
              <input id="quick-view-search" type="search" placeholder="Schnellansichten filtern …" aria-label="Schnellansichten filtern">
              <select id="quick-view-list" size="10" aria-label="Schnellansicht zum Bearbeiten"></select>
              <div class="setup-actions quick-list-actions"><button id="quick-new" type="button">+ Neu</button><button id="quick-up" type="button" aria-label="Schnellansicht nach oben" title="Schnellansicht nach oben">↑</button><button id="quick-down" type="button" aria-label="Schnellansicht nach unten" title="Schnellansicht nach unten">↓</button></div>

            </div>
            <div class="quick-form">
              <label class="section-title" for="quick-name">Name der Schnellansicht</label>
              <input id="quick-name" type="text" maxlength="70" placeholder="z. B. Termine für das Pfarramt">
              <div class="quick-fields">
                <div><label for="quick-group">Kategorie</label><select id="quick-group"></select></div>
                <div><label for="quick-mode">Auswahlmethode</label><select id="quick-mode"><option value="rules">Bereiche und Kalenderarten</option><option value="keys">Einzelne Kalender</option></select></div>
              </div>
              <label class="quick-toggle"><input id="quick-visible" type="checkbox"> In den Schnellansichten anzeigen</label>
              <div class="quick-config" id="quick-rules">
                <strong>Bereiche</strong><div class="quick-checks" id="quick-areas"></div>
                <strong>Kalenderarten</strong><div class="quick-checks" id="quick-types"></div>
                <strong>Zusätzliche Kalender</strong><div class="quick-checks" id="quick-extra"></div>

                <input type="checkbox" id="quick-planning" hidden><input type="checkbox" id="quick-unassigned" hidden>
                <p class="setup-note">Bereich × Art als Schnittmenge. Für nicht zuordenbare Kalender gibt es „Ohne Bereich“.</p>
              </div>
              <div class="quick-config" id="quick-keys" hidden>
                <label for="quick-key-search">Einzelne Kalender auswählen</label><input id="quick-key-search" type="search" placeholder="Kalender suchen …">
                <div class="quick-key-list" id="quick-key-list"></div>
                <p class="setup-note">Feste Kalenderauswahl: Neue Kalender werden nicht automatisch ergänzt.</p>
              </div>
              <p class="setup-note" id="quick-editor-note"></p>
            </div>
          </div>
        </section>
        </div>
        <div class="setup-subpanel" data-setup-panel="categories" hidden>
          <p class="setup-intro">Kategorien organisieren die Schnellansichten im Auswahlmenü. Hier kannst du Kategorien anlegen, umbenennen, sortieren oder leere Kategorien löschen.</p>
          <section class="dimension category-management" aria-label="Kategorien verwalten">
            <div class="dimension-title"><strong>Kategorien der Schnellansichten</strong><span class="setup-note">Organisation und Reihenfolge</span></div>
            <div class="classification-grid quick-category-editor">
              <div class="classification-sidebar">
                <label class="section-title" for="quick-category-list">Vorhandene Kategorien</label>
                <select id="quick-category-list" size="10" aria-label="Kategorie zur Bearbeitung wählen"></select>
                <div class="setup-actions classification-actions category-actions">
                  <button id="quick-category-new" type="button" title="Neue Kategorie anlegen">+ Neu</button>
                  <button id="quick-category-up" type="button" title="Nach oben" aria-label="Kategorie nach oben">↑</button>
                  <button id="quick-category-down" type="button" title="Nach unten" aria-label="Kategorie nach unten">↓</button>
                  <button id="quick-category-delete" type="button" title="Nur leere Kategorien löschen">Löschen</button>
                </div>
              </div>
              <div class="classification-form">
                <label class="section-title" for="quick-category-name">Name der Kategorie</label>
                <input id="quick-category-name" type="text" maxlength="45" placeholder="Neue oder vorhandene Kategorie">
                <p class="setup-note" id="quick-category-mode-hint">„+ Neu“ startet eine neue Kategorie mit leerem Namensfeld. Die eigentliche Anlage erfolgt über „Kategorie anlegen“ in der Fußzeile.</p>
                <label class="section-title" for="quick-category-members">Zugeordnete Schnellansichten</label>
                <div id="quick-category-members" class="setup-members" aria-live="polite"></div>
              </div>
            </div>
          </section>
        </div>
        <div class="setup-subpanel" data-setup-panel="saved" hidden>
          <p class="setup-intro">Gespeicherte Kalenderprofile und Sortier-Sets zentral verwalten. Reihenfolgen bestimmen die Anzeige in den jeweiligen Auswahlmenüs.</p>
          <section class="dimension" aria-label="Gespeicherte Profile und Sortier-Sets verwalten">
            <div class="dimension-title"><strong>Eigene Profile &amp; Sortier-Sets</strong><span class="setup-note">Umbenennen, sortieren und löschen</span></div>
            <div class="classification-grid">
              <div class="classification-sidebar">
                <label class="section-title" for="saved-manager-kind">Eintragstyp</label>
                <select id="saved-manager-kind"><option value="profiles">Kalenderprofile</option><option value="sorting">Sortier-Sets</option></select>
                <label class="section-title" for="saved-manager-list">Gespeicherte Einträge</label>
                <select id="saved-manager-list" size="10" aria-label="Gespeicherten Eintrag auswählen"></select>
                <div class="setup-actions classification-actions">
                  <button id="saved-manager-up" type="button" title="Nach oben" aria-label="Eintrag nach oben">↑</button>
                  <button id="saved-manager-down" type="button" title="Nach unten" aria-label="Eintrag nach unten">↓</button>
                  <button id="saved-manager-delete" type="button">Löschen</button>
                </div>
              </div>
              <div class="classification-form">
                <label class="section-title" for="saved-manager-name">Name des Eintrags</label>
                <input id="saved-manager-name" type="text" maxlength="60" placeholder="Eintrag auswählen">
                <p class="setup-note" id="saved-manager-detail" aria-live="polite"></p>
                <p class="setup-note">Neue Profile werden unter „Profile &amp; Filter“ oder „Einzelauswahl“ gespeichert. Neue Sortier-Sets werden unter „Sortierung“ gespeichert. Hier erfolgt ausschließlich ihre Organisation.</p>
              </div>
            </div>
          </section>
        </div>
        <div class="setup-subpanel" data-setup-panel="backup" hidden>
          <p class="setup-intro">Komplette Konfiguration für einen späteren Import sichern. Einzelne Kalenderprofile und Sortier-Sets werden in ihren Arbeitsreitern gespeichert und im Unterreiter „Profile &amp; Sortier-Sets“ verwaltet.</p>
          <section class="profile-section setup-backup">
            <div class="toolbar"><strong class="section-title">Datensicherung und Gerätewechsel</strong></div>
            <p class="setup-note">Sichere deine Profile, Sortier-Sets, Schnellansichten und Auswahleinstellungen als JSON. Die Datei kann vertrauliche Kalendernamen enthalten.</p>
            <input id="settings-file" type="file" accept=".json,application/json" hidden>
            <div class="setup-note" id="settings-summary"></div>
            <p class="setup-note">Import nur mit Bestätigung. Keine Änderung an der aktiven Kalenderanzeige oder Serversortierung.</p>
          </section>
          <section class="dimension"><div class="dimension-title"><strong>Information</strong></div><p class="setup-note">Einstellungen werden im lokalen Browserspeicher gespeichert. Die JSON-Sicherung enthält auch eigene Schnellansichten und ihre Reihenfolge.</p></section>        </div>
      </div>
    </div>
    <div class="foot"><div class="status" id="status" role="status" aria-live="polite"></div><div class="foot-controls">
      <div class="setup-footer-actions" data-setup-footer="classification" hidden><button id="classification-reset" type="button">Standard wiederherstellen</button><button id="classification-save" class="primary" type="button">Konfiguration speichern</button></div>
      <div class="setup-footer-actions" data-setup-footer="quick" hidden><button id="quick-reset" type="button">Auf Standard zurücksetzen</button><button id="quick-delete" type="button">Eigene Ansicht löschen</button><button id="quick-save" class="primary" type="button">Ansicht speichern</button></div>
      <div class="setup-footer-actions" data-setup-footer="categories" hidden><button id="quick-category-rename" class="primary" type="button" disabled>Kategorie umbenennen</button></div>
      <div class="setup-footer-actions" data-setup-footer="saved" hidden><button id="saved-manager-rename" class="primary" type="button">Umbenennen</button></div>
      <div class="setup-footer-actions" data-setup-footer="backup" hidden><button id="settings-export" type="button">JSON exportieren</button><button id="settings-import" class="primary" type="button">JSON importieren …</button></div>
      <button id="sort-refresh-page" class="refresh-btn" type="button" title="Kalenderansicht neu laden" hidden>Neu laden</button><button class="primary" id="sort-apply" type="button">Sortierung serverseitig übernehmen</button><button class="primary" id="apply" type="button">Auswahl anwenden</button></div></div>`;
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
  // A single editor handles both saved record kinds; IDs never change on rename.
  const savedRecords=kind=>kind==='sorting'?sortSets:profiles;
  const saveRecords=kind=>kind==='sorting'?persistSortSets():persist();
  function renderSavedManager(selectId){
    const kind=el('saved-manager-kind').value,entries=savedRecords(kind),list=el('saved-manager-list');
    const wanted=selectId===undefined?list.value:selectId;
    list.replaceChildren();
    for(const item of entries){const option=document.createElement('option');option.value=item.id;option.textContent=item.label;list.appendChild(option);}
    list.value=entries.some(x=>x.id===wanted)?wanted:(entries[0]?.id||'');
    const index=entries.findIndex(x=>x.id===list.value),entry=entries[index];
    el('saved-manager-name').value=entry?.label||'';
    el('saved-manager-name').disabled=!entry||busy;
    el('saved-manager-up').disabled=busy||index<=0;
    el('saved-manager-down').disabled=busy||index<0||index===entries.length-1;
    el('saved-manager-delete').disabled=busy||!entry;
    el('saved-manager-rename').disabled=busy||!entry;
    el('saved-manager-detail').textContent=entry?(kind==='sorting'
      ?entry.keys.length+' Kalender in diesem Sortier-Set · '+entry.pinned.length+' fixiert.'
      :entry.keys.length+' Kalender · '+(entry.filters?'Filterprofil':'Feste Auswahl'))
      :'Noch keine '+(kind==='sorting'?'Sortier-Sets':'Kalenderprofile')+' gespeichert.';
  }
  function changeSavedManager(action){
    if(busy)return;
    const kind=el('saved-manager-kind').value,old=savedRecords(kind),id=el('saved-manager-list').value;
    const index=old.findIndex(x=>x.id===id);if(index<0)return;
    let next=old.map(x=>({...x})),focus=id;
    if(action==='rename'){
      const name=cleanName(el('saved-manager-name').value);
      if(!name||name.length>60)return status('Name muss 1 bis 60 Zeichen enthalten.');
      if(next.some(x=>x.id!==id&&norm(x.label)===norm(name)))return status('Name ist bereits vergeben.');
      next[index].label=name;
    }else if(action==='delete'){
      if(!confirm((kind==='sorting'?'Sortier-Set':'Kalenderprofil')+' „'+next[index].label+'“ endgültig löschen?'))return;
      next.splice(index,1);focus=next[Math.min(index,next.length-1)]?.id||'';
    }else{
      const target=index+(action==='up'?-1:1);
      if(target<0||target>=next.length)return;
      [next[index],next[target]]=[next[target],next[index]];
    }
    if(kind==='sorting')sortSets=next;else profiles=next;
    if(!saveRecords(kind)){
      if(kind==='sorting')sortSets=old;else profiles=old;
      renderSavedManager(id);return status('Änderung konnte nicht gespeichert werden.');
    }
    if(action==='delete'){
      if(kind==='sorting'&&currentSortSet===id)currentSortSet='';
      if(kind==='profiles'&&choice==='saved:'+id){choice='manual';selectionKind='manual';syncSummaryFromManual();persistDraft();}
    }
    renderAll();renderSavedManager(focus);
    status((kind==='sorting'?'Sortier-Set':'Kalenderprofil')+' '+({rename:'umbenannt',delete:'gelöscht',up:'nach oben verschoben',down:'nach unten verschoben'}[action])+'.');
  }
  el('saved-manager-kind').addEventListener('change',()=>renderSavedManager(''));
  el('saved-manager-list').addEventListener('change',()=>renderSavedManager());
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
    for (const id of ['apply','save','all','none','all-individual','none-individual','individual-release-fixed','individual-toggle-visible','reload','reload-individual','presets','presets-individual','areas-all','areas-none','types-all','types-none','sort-mode','sort-copy','sort-pin-always','save-individual','reload-individual','saved-profiles','saved-profiles-individual','sort-reset','sort-save-set','sort-sets','preferred-area','settings-export','settings-import','always-visible-search','saved-manager-kind','saved-manager-list']) el(id).disabled=value;
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
