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

