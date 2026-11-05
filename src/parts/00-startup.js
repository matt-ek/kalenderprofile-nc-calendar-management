(function () {
  'use strict';
  const VERSION = '2.0.3';
  const HOST_ID = 'nc-calendar-management-generic-v2';
  const existing = document.getElementById(HOST_ID);
  if (existing) { existing.__kpDispose?.(); existing.remove(); return; }

  const calendarContainer = document.querySelector('.calendar-list-wrapper') ||
    document.querySelector('li.draggable-calendar-list-item')?.parentElement;
  if (!calendarContainer) {
    alert('Kalenderprofile: Keine Nextcloud-Kalenderliste gefunden. Bitte zuerst die Kalender-App öffnen.');
    return;
  }

