# Qualitätssicherung – Kalenderprofile 2.0.4 (Installer)

**Status:** Vom Projekteigentümer ausdrücklich zur Veröffentlichung freigegeben; offizielle Auslieferung nach erfolgreichem Publishing-Workflow.  
**Gegenstand:** Ausschließlich HTML-Installer, generierter Bookmarklet-Versionsstand und Build-/Prüfprozess.

## Ziel und Abgrenzung

- Aktuelle Version in allen sichtbaren Installer-Angaben aus der Version des JavaScript-Quellcodes übernehmen; keine manuell gepflegte Versionskopie.
- Veraltete Beta-spezifische Beschreibung aus dem Installer entfernen.
- Reproduzierbare Erstellung aus `install/installer-template.html` statt In-Place-Änderung einer früher generierten Datei.
- Drag-and-drop und Copy/Paste per Codebox liefern **identische vollständige Bookmarklet-URLs**. Es wird kein externer Loader hinzugefügt.
- Bestehende Funktionen, CalDAV-Verhalten, JSON-Format und lokale Speicherkennungen bleiben unangetastet.

## Automatisierte Prüfkriterien

| Prüfung | Umsetzung | Erwartung |
| --- | --- | --- |
| Quellstand und Paket | `python scripts/build.py` und `python tests/check_release.py` | Bundle, URL und HTML stimmen exakt mit der Vorlage überein |
| Versionskonsistenz | Statischer Installer-Test | Kopf und Fuß nennen beide 2.0.4 |
| Alte Beschreibung | Statischer Test und Browserprüfung | Keine sichtbaren „Beta 15“- oder „V2.0.1“-Angaben |
| Desktopansicht | Playwright Chromium, 1440 Pixel | Beide Installationsmethoden sichtbar, keine Seitenüberbreite |
| Schmale Ansicht | Playwright Chromium, 390 Pixel | Einspaltiges Layout, keine horizontale Seitenüberbreite |
| Codebox | Playwright | Schaltflächen-URL und readonly-Codebox sind bytegleich |
| Clipboard | Playwright mit simulierter Browser-Zwischenablage | Kopiert den kompletten Bookmarklet-Link |
| Clipboard-Fallback | Playwright mit blockierter Zwischenablage | Auswahl und Kopieren über Fallback, Erfolgsmeldung |
| Offline-Verhalten | Playwright über lokale Datei | Keine externen HTTP(S)-Anfragen bei Installation |
| Releasetauglichkeit | `python tests/test_release_packaging_203.py` | Reproduzierbares ZIP, aktuelle Release Notes vorhanden |

### Manuelle Prüfpunkte (nicht durch CI belegt)

- [ ] Installer lokal unter Windows in Chrome öffnen; Drag-and-drop in Lesezeichenleiste prüfen.
- [ ] Installer lokal unter Windows in Edge öffnen; Drag-and-drop prüfen.
- [ ] Codebox-Inhalt über „Code kopieren“ in die URL eines neu angelegten Lesezeichens einfügen und starten.
- [ ] Browser mit blockiertem Clipboard prüfen; markierten Code mittels Strg+C kopieren.
- [ ] Kalenderprofile auf der tatsächlichen Nextcloud-Kalenderseite starten und gespeicherte Profile auf unveränderte Funktion prüfen.
- [ ] Vorhandene CalDAV-Risiken bleiben dokumentiert; für die reine Installer-Umgestaltung sind keine serverseitigen Schreibtests erforderlich.

## Veröffentlichung

Das bestehende GitHub-Release `v2.0.3` und dessen unveränderliche Assets werden nicht rückwirkend geändert. Für 2.0.4 wurde die Veröffentlichung ausdrücklich freigegeben. Der vorangegangene Qualitätslauf auf `main` [42125828056](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42125828056) war erfolgreich. Die noch offenen manuellen Prüfpunkte gelten **nicht** als durchgeführt; die Freigabe akzeptiert deren dokumentierten Restumfang für diese auf den Installer begrenzte Patch-Version. Die Release-Pipeline führt die automatisierten Tests erneut aus und erzeugt nur bei Erfolg einen eigenen unveränderlichen Tag sowie neue Assets. Nach der Veröffentlichung müssen Tag, Assets und SHA256SUMS.txt überprüft werden.


**Freigabe:** GO durch ausdrückliche Nachricht des Projekteigentümers; kein Nachweis zusätzlicher manueller Browser- oder Live-Nextcloud-Tests.
