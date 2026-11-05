# Qualitätssicherung und Freigabe – Kalenderprofile 2.0.3

**Stand:** 05.11.2026  
**Status:** Release-Kandidat; echte Nextcloud-Kompatibilitätsabnahme ausstehend.

## 1. Nachweisbarer Basisstand

- Letzter bereits veröffentlichter Stand vor diesem Kandidaten: v2.0.2, 04.11.2026.
- Projektplan, Release-Prozess und PR-Vorlage wurden über PR #10 auf main übernommen.
- Neues Testskript: `tests/test_caldav_safety_203.py`.
- Testenvironment: Chromium/Playwright, statisches Nextcloud-DOM und lokaler JavaScript-Fetch-Mock; **keine echten Serververbindungen**.
- GitHub-CI-Nachweis für Build, UI-Start, Editor, CalDAV-Regression und Installer-Konsistenz: [Workflow 42117651727](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42117651727), Status erfolgreich auf Zwischenstand `e76bbf7eba00ecbbdfad7722a9221e3e46c4b1a6`. Neuere Änderungen – insbesondere der Release-Workflow und die vollständige Kandidaten-Dokumentation – sind bis zum abschließenden Kandidatenlauf separat zu prüfen.
- Nicht durchgeführte Live-Tests werden ausdrücklich nicht als bestanden bewertet.

## 2. Regressionstestmatrix (simulierte Nextcloud)

| Prüfung | Nachweisverfahren | Erwartung |
| --- | --- | --- |
| Start der Oberfläche | Chromium mit gefälschter Kalenderliste | Initialisierung ohne JS-Fehler |
| Probe ohne Änderungen | `PROPFIND` für Kalenderverzeichnis | Keine `PROPPATCH`-Aufrufe |
| Fehlende DAV-Zuordnung | Server liefert weniger Kalender als Browser | Schreibfreigabe bleibt deaktiviert |
| Ungültige DAV-Reihenfolge | Server liefert nichtnumerische Sortierung | Keine Schreiboperation |
| Benutzer bricht Übernahme ab | Dialog wird verworfen | Keine Schreiboperation |
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
| Chrome auf Windows | Für manuelle Abnahme vorgesehen | Nicht in 2.0.3 verifiziert |
| Edge auf Windows | Für manuelle Abnahme vorgesehen | Nicht in 2.0.3 verifiziert |
| Nextcloud-Server 34.0.1.2 / Kalender-App auf produktiver Instanz | Keine 2.0.3-Live-Prüfung erfolgt | Keine Kompatibilitätszusage |
| Weitere Nextcloud- und Kalender-App-Versionen | Nicht geprüft | Unbekannt |

Die Versionen realer Testinstanzen sollen beim ersten Live-Test protokolliert werden; keine Kalendernamen oder Nutzerkennungen in öffentlichen Nachweisen aufnehmen.

## 4. Qualitäts-Gates und Freigabe

- [x] Projektplan, Risiken und Entwicklungs-/PR-Prozess dokumentiert.
- [x] Build-/Browser-/CalDAV-Regressionsprüfung für einen Zwischenstand erfolgreich (oben referenziert).
- [ ] Letzter Commit des 2.0.3-Kandidaten durch alle verpflichtenden CI-Checks erfolgreich.
- [ ] Release-Pipeline auf Tag- und Prüfsummenlogik geprüft.
- [ ] Kontrollierter manueller Start-/Bedientest mit tatsächlicher Nextcloud-Kalenderoberfläche.
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
