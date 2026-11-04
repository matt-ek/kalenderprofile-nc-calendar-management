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

