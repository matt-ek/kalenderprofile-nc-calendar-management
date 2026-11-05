# Qualitätssicherung und Freigabe – Kalenderprofile 2.0.3

**Stand:** 05.11.2026  
**Status:** Release-Kandidat; automatisierte QA bestanden, manueller Funktionstest vom Anwender positiv bestätigt. Präziser Umfang der Live-Kompatibilitäts- und CalDAV-Schreibtests ist nicht dokumentiert.

## 1. Nachweisbarer Basisstand

- Letzter bereits veröffentlichter Stand vor diesem Kandidaten: v2.0.2, 04.11.2026.
- Projektplan, Release-Prozess und PR-Vorlage wurden über PR #10 auf main übernommen.
- Neues Testskript: `tests/test_caldav_safety_203.py`.
- Testenvironment: Chromium/Playwright, statisches Nextcloud-DOM und lokaler JavaScript-Fetch-Mock; **keine echten Serververbindungen**.
- GitHub-CI-Nachweis für Build, UI-Start, Editor, CalDAV-Regression und Installer-Konsistenz: [Workflow 42117651727](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42117651727), Status erfolgreich auf Zwischenstand `e76bbf7eba00ecbbdfad7722a9221e3e46c4b1a6`. Abschließender CI-Nachweis zum Code- und Workflowstand `f4c9c75a45cc4c0483d6a4aaecf07417628ebba3`: [Workflow 42119552222](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42119552222) erfolgreich. Durch diese Dokumentationsfortschreibung entsteht ein neuer Commit, dessen CI erneut zu prüfen ist.
- Anwender-Rückmeldung vom 05.11.2026: „getestet, funktioniert“. Als erfolgreich gemeldeter manueller Funktionstest erfasst; verwendeter Browser, genaue Nextcloud-Version und konkrete geprüfte CalDAV-Operationen wurden nicht angegeben. Eine versionsübergreifende Kompatibilität wird daraus nicht abgeleitet.
- Nicht bestätigte spezielle Live-Tests werden ausdrücklich nicht als bestanden bewertet.

## 2. Regressionstestmatrix (simulierte Nextcloud)

| Prüfung | Nachweisverfahren | Erwartung |
| --- | --- | --- |
| Start der Oberfläche | Chromium mit gefälschter Kalenderliste | Initialisierung ohne JS-Fehler |
| Probe ohne Änderungen | `PROPFIND` für Kalenderverzeichnis | Keine `PROPPATCH`-Aufrufe |
| Fehlende DAV-Zuordnung | Server liefert weniger Kalender als Browser | Schreibfreigabe bleibt deaktiviert |
| Ungültige DAV-Reihenfolge | Server liefert nichtnumerische Sortierung | Keine Schreiboperation |
| Benutzer bricht Übernahme ab | Dialog wird verworfen | Keine Schreiboperation |
| Bestätigte Sortierung und Wiederherstellung | Freigabe, verifizierte PROPPATCH-Schreibvorgänge und explizite Rücknahme | Neureihenfolge und Originalreihenfolge werden jeweils nachgelesen |
| Fehler nach Teiländerung | Erster `PROPPATCH` wirkt, Antwort ist HTTP 500 | Rücknahmeversuch; Fehler statt Erfolg |
| Rücknahme ebenfalls fehlerhaft | Simulierter Server lehnt auch die Rücknahme ab | Explizite Warnung über fehlgeschlagene Rücknahme |
| Netzwerk-Lesefehler | PROPFIND bricht vor der Zuordnung ab | Keine Schreiboperation |
| Build-Konsistenz | Quell- und Installationsartefaktvergleich | Identisch zur Modulquelle |
| Release-Archiv | Zweifache Git-Archive-Erzeugung und SHA-256-Kontrolle | Byteidentische ZIPs, vollständiges Archiv |
| Editor-Regressionsschutz | Vorhandener Browser-Test | Profile, Sortier-Sets und Dialogstart funktionieren |

Die simulierten Ergebnisse beweisen **nicht**, dass das Serververhalten auf allen Nextcloud-Versionen identisch ist.

## 3. Plattform-Kompatibilitätsmatrix

| Umgebung | Prüfstatus | Aussage |
| --- | --- | --- |
| GitHub Actions / Ubuntu 24.04 / Chromium (Playwright 1.56.0) | Automatisiert getestet | Simulierte UI und DAV |
| Chrome auf Windows | Nicht gesondert bestätigt | Der manuelle Funktionstest enthält keine Browserangabe |
| Edge auf Windows | Nicht gesondert bestätigt | Der manuelle Funktionstest enthält keine Browserangabe |
| Nextcloud-Server 34.0.1.2 / Kalender-App auf produktiver Instanz | Nicht einzeln bestätigt | Positive Anwender-Rückmeldung ohne Versions-/Funktionsprotokoll; keine pauschale Kompatibilitätszusage |
| Weitere Nextcloud- und Kalender-App-Versionen | Nicht geprüft | Unbekannt |

Die Versionen realer Testinstanzen sollen beim ersten Live-Test protokolliert werden; keine Kalendernamen oder Nutzerkennungen in öffentlichen Nachweisen aufnehmen.

## 4. Qualitäts-Gates und Freigabe

- [x] Projektplan, Risiken und Entwicklungs-/PR-Prozess dokumentiert.
- [x] Build-/Browser-/CalDAV-Regressionsprüfung für einen Zwischenstand erfolgreich (oben referenziert).
- [x] Code-/Workflowstand `f4c9c75` durch alle verpflichtenden CI-Checks erfolgreich (Workflow 42119552222). Dokumentationsfolgecommits gesondert prüfen.
- [x] Release-Packaging-Logik sowie deterministisches ZIP und Prüfsummen im CI-Kontext geprüft. Tatsächliche Tag-Veröffentlichung und Asset-Download stehen noch aus.
- [x] Manueller Funktionstest vom Anwender als erfolgreich gemeldet („getestet, funktioniert“); Testumgebung und Prüfumfang nicht gesondert protokolliert.
- [ ] Für serverseitige Schreibfunktionen: ausdrückliche Freigabe und Dummy-Kalender-Test auf autorisierter Instanz, andernfalls Restrisiko dokumentieren.
- [ ] Go/No-Go und Release-Commit protokolliert.
- [ ] GitHub-Release-Tag und Assets erstellt und gegen SHA256SUMS.txt verifiziert.

**Freigabeentscheidung:** Noch offen. Der Kandidat ist erst dann ein offiziell veröffentlichtes Release, wenn die erforderlichen Gates bestätigt sind.

## 5. Risiken und Rollback

- Keine atomare CalDAV-Transaktion bei Mehrfachänderungen; unklarer Serverzustand ist möglich.
- Browser-/Nextcloud-DOM-Änderungen können Selektoren inkompatibel machen.
- Das Bookmarklet läuft im Kontext der aktiven Benutzersitzung; nur vertrauenswürdige Quellen installieren.
- JSON-Exporte können Kalenderbezeichnungen enthalten; keine privaten Exporte in Issues, Logs oder Test-Repositories.
- Fällt 2.0.3 beim Nutzer aus, ist 2.0.2 als bereits veröffentlichtes Installationsasset vorhanden. Die gespeicherte Konfiguration bleibt formatkompatibel; eine serverseitige Rücknahme von CalDAV-Schreibvorgängen wird dadurch **nicht** garantiert.
