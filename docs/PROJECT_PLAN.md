# Projekt- und Entwicklungsplan – Kalenderprofile

**Stand:** 05.11.2026  
**Repository:** matt-ek/kalenderprofile-nc-calendar-management  
**Bestätigter Referenzstand:** 2.0.2 (04.11.2026)  
**Planungsstatus:** Vorschlag zur Freigabe; keine Code- oder Produktänderung mit diesem Dokument

## 1. Auftrag und Produktziel

Kalenderprofile ist ein eigenständig ausführbares Bookmarklet für die Nextcloud-Kalender-App. Das Produkt bietet Profile, Schnellansichten, Filter für Bereiche und Kalenderarten, feste und dynamische Auswahlen, Sortier-Sets und JSON-Sicherungen. Es setzt keine zusätzliche Nextcloud-App und keinen externen Runtime-Loader voraus.

**Ziel:** Aus dem funktionierenden Stand 2.0.2 ein verlässlich testbares, sicher aktualisierbares, dokumentiertes und langfristig wartbares Produkt entwickeln. **Stabilität, Datenintegrität und reproduzierbare Releases haben Vorrang vor neuen Features und maximaler Dateiverkleinerung.**

### Verbindliche Leitplanken

1. Bestehende Funktionen und die bekannte Bedienung bleiben erhalten, sofern keine eigene Anforderung ausdrücklich Änderungen freigibt.
2. Im ersten Stabilisierungsschritt keine ungeplante Änderung an UI/UX, Speicher-IDs, JSON-Schema oder CalDAV-Semantik.
3. Veröffentlichte Release-Tags und Assets nicht stillschweigend überschreiben.
4. Veränderungen an Kalendern auf dem Server nur nach ausdrücklicher Benutzerbestätigung; fehlerhafte Zuordnungen dürfen nicht zu Schreibvorgängen führen.
5. Kein Einsatz echter personenbezogener Kalenderdaten, Tokens oder produktiver Exportdateien in Repository, Issues oder CI.
6. Kein Release ohne dokumentierte bestandene Gates, vollständigen Installer und einen verantwortlichen Freigabeentscheid.
7. Die Quellmodule sind die einzige autoritative Codebasis; generierte Dateien werden reproduzierbar daraus erzeugt.
8. Das Repository bleibt privat, bis eine gesonderte Entscheidung zur Sichtbarkeit getroffen wird. Die MIT-Lizenz der enthaltenen Quellen ist davon zu unterscheiden.

## 2. Verifizierte Ausgangslage (GitHub-Inspektion 05.11.2026)

| Bereich | Beobachtung | Einordnung |
| --- | --- | --- |
| Version | 2.0.2 veröffentlicht; 2.0.1 dokumentierter Startfehler | 2.0.2 als Baseline |
| Quellen | Acht JS-Teile, CSS und HTML; generiertes JS und Installer | Modularisierte Entwicklung, aber gemeinsamer IIFE-Zustand |
| Größe | Generiertes JS ca. 231 KB, Installations-HTML ca. 320 KB (GitHub-Dateigrößen, keine Laufzeitmessung) | Größe beobachten, nicht isoliert optimieren |
| CI | Build-/Qualitätsworkflow mit Node, Python und Playwright; letzter gelisteter main-Lauf am 04.11. erfolgreich | Gute Grundlage, Testumfang ausbauen |
| Release-Automation | Versionen 2.0.0–2.0.2 und Trigger im Release-Workflow fest definiert | Für künftige Releases generalisieren |
| Tests | Aktuell in tests/ sichtbar: check_release.py und test_saved_editor_201.py | Ältere QA-Dokumente erwähnen weitere nicht vorhandene Testdateien; Nachweis klären |
| Dokumentation | README, CONTRIBUTING, ARCHITECTURE, changelog, QA-Berichte und Release Notes | Gute Basis, Prozesssteuerung ergänzen |
| Planung | Zum Inspektionszeitpunkt keine offenen/geschlossenen Issues oder PRs aus der Repo-Suche | GitHub-Backlog neu strukturiert |
| CalDAV | Schreiboperationen nach Prüfung/Bestätigung; nicht atomare Mehrfachänderungen | Explizites Restrisiko und wichtigste Testpriorität |
| Plattform | Browser-Ausführung in Nextcloud-Benutzersitzung | Sicherheit und Kompatibilität testen |

**Abgrenzung der Evidenz:** Die Inspektion umfasste Repository-Dateien, Workflows, Metadaten, Release-Liste und angezeigte Workflow-Ergebnisse. Es wurde in dieser Planungsphase kein eigener Build, Penetrationstest, End-to-End-Test gegen eine reale Nextcloud-Instanz oder Benchmark ausgeführt. Die Bezeichnung „bestanden“ bezieht sich nur auf nachgewiesene vorhandene CI-Läufe und historische QA-Dokumente.

## 3. Priorisierter Arbeitsplan

### Phase A – Baseline und sichere Lieferung (P0; empfohlen für 2.0.x / 2.0.3)

**Zweck:** Sicherheits- und Auslieferungsrisiken reduzieren, ohne das Produktverhalten zu verändern.

- [#1](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/1): Referenzstand, Testinventar, QA-Nachweise und Risiken konsolidieren.
- [#2](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/2): CalDAV-Fehlerpfade und Schreibsicherungen testbar absichern.
- [#3](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/3): Versionsagnostische Release-Pipeline, reproduzierbare Assets, unveränderliche Tags.
- [#4](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/4): Freigabekriterien und konkrete Nextcloud-/Browser-Kompatibilitätsmatrix.

**Abnahme:** keine bekannten kritischen Start-/Datenschutz-/CalDAV-Schreibblocker; CI grün; Installer nach Build identisch und startfähig; Release-Assets und Checksumme nachgewiesen; Rollback dokumentiert. 2.0.3 ist ein **Planungsziel**, kein bereits zugesagtes Release.

### Phase B – Belastbarkeit und Konsolidierung (P1; Kandidat 2.1.x)

- [#5](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/5): Konfigurationspersistenz, Im-/Export und Altformatverträglichkeit.
- [#6](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/6): Architektur-/Performance-/Größenreview ohne unbeauftragte Verhaltensänderung.
- [#7](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/7): UI/UX-, Tastatur- und Barrierefreiheitsaudit, zunächst rein analysierend.
- [#8](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/8): Sicherheit, Datenschutz und Installationsvertrauen.

**Abnahme:** nachweisbare Regressionstests, Daten- und UI-Kompatibilität, Vorher/Nachher-Messung, kritische Findings beseitigt; featurebezogene Änderungen nur als explizit genehmigte Folge-Issues.

### Phase C – Gezielt neue Funktionen (P2; Kandidat 2.2.x)

- [#9](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/9): Portables Vorlagenformat und Architekturentscheidung über Standalone-Bookmarklet, optionalen Loader oder andere Verpackungen.

**Abnahme:** Architecture Decision Record (ADR), Migrations- und Sicherheitsfolgen, Pilotnachweis, Rückwärtskompatibilität und gesonderte Produktfreigabe. Keine automatische technische Neuausrichtung aufgrund dieses Plans.

## 4. Steuerung und Verantwortlichkeiten

| Rolle | Verantwortung |
| --- | --- |
| Produktverantwortung (Repository-Eigentümer) | Priorität, Funktionsumfang, Freigabe, Änderung von Sicherheits-/Kompatibilitätsgrenzen |
| Umsetzung (Beitragende oder unterstützte Entwicklung) | Issue-basierte Änderung, verständlicher Commit, Test und PR-Nachweise |
| Review (separater Reviewer wo verfügbar) | Code-, Risiko- und Testprüfung; bei Einzelentwicklung dokumentierter Selbstreview |
| Release-Verantwortung | Go/No-Go, Release Notes, Assets, Checksummen, Tag, Hotfix-/Rollbackpfad |

Empfohlener Rhythmus: wöchentliches Backlog-Triage, kurze Entwicklungsiterationen von ein bis zwei Wochen und Releases nur nach den Gates. Dies ist eine Arbeitsweise, keine Termin- oder Kapazitätszusage. Ein GitHub Project Board ist optional; Issues + Milestones genügen zunächst.

## 5. Issue- und Pull-Request-Workflow

- **Backlog:** Anforderung mit Problem, Umfang, Akzeptanzkriterien und Risiko beschreiben.
- **Ready:** priorisiert, Abhängigkeiten geklärt, Testidee vorhanden, keine unklare Fachentscheidung.
- **In Progress:** dedizierter Branch pro zusammengehöriger Änderung; kein direkter Feature-Commit auf main.
- **Review:** Pull Request mit Issue-Verweis, Risiko, Testnachweis, UI-/Schema-/CalDAV-Impact und gegebenenfalls Screenshots.
- **Verified:** automatisierte Checks plus relevante manuelle Tests erfolgreich.
- **Done:** in main übernommen und Issue geschlossen; ausgelieferter Stand zusätzlich im Release verknüpft.

**Prioritäten:** P0 = Veröffentlichung/Sicherheit/Datenintegrität oder Entwicklungsblocker; P1 = Robustheit, Wartbarkeit, wesentliche Bedienbarkeit; P2 = neue Optionen und mittelfristige Erweiterung.

**Änderungsdisziplin:** kleine PRs, keine vermischten Refactorings und Features, keine Behauptung ungetesteter Kompatibilität. Zur initialen Einrichtung tragen die Backlog-Issues die Priorität im Titel; Labels können später ergänzt werden.

## 6. Qualitäts- und Release-Gates

| Gate | Nachweis | Blockierend? |
| --- | --- | --- |
| G1 Reproduzierbarer Build | build.py, Git-Diff null, JS- und Installer-Konsistenz | Ja |
| G2 Start-/Interaktions-Smoke | Chromium-/Browserstart, öffnender und schließender Dialog, kein unbehandelter Fehler | Ja |
| G3 Funktionale Regression | Profile, Filter, Suche, Sortier-Sets, lokale Einstellungen | Ja bei betroffenem Modul |
| G4 Import, Export und Migration | Gültige/ungültige JSONs, Altschema, Wiederstart, keine ungewollte Mutation | Ja |
| G5 CalDAV-Sicherheit | Read-only-Prüfung, explizite Bestätigung, fehlerhafte Zuordnung, Teilfehler/Rücknahme | Ja bei CalDAV-Veränderung; vor stabilem Folge-Release als Grundabdeckung ergänzen |
| G6 UI/UX & Zugänglichkeit | Keine ungewollte Verschlechterung, Fokus- und Tastaturprüfung | Ja bei betroffenem Modul |
| G7 Datenschutz/Security | Keine Geheimnisse in Artefakten; offene Hochrisiken bewertet | Ja bei kritischen/hohen Findings |
| G8 Plattform-Kompatibilität | Evidenz je überprüfter Browser-/Nextcloud-Kombination, keine Pauschalzusagen | Ja für deklarierte Supportmatrix |
| G9 Veröffentlichung | signierter oder eindeutig zugeordneter Tag, Checksummen, Release Notes, installierbares Asset | Ja |

Ein Gate gilt erst nach tatsächlich ausgeführtem und dokumentiertem Test als erfüllt; eine Prüfbeschreibung ersetzt keinen Lauf. Bei unklarer oder abgebrochener CalDAV-Transaktion keine automatische Erfolgsmeldung.

## 7. Entscheidungs- und Risikolog

| ID | Risiko / Entscheidung | Behandlung |
| --- | --- | --- |
| R-01 | Nicht atomare CalDAV-Mehrfachschreibvorgänge | Negative Tests, Recovery-Dokumentation, ausdrückliche Freigabe |
| R-02 | Nextcloud-/DOM-Version ändert Selektoren | Adaptertests und gepflegte Kompatibilitätsmatrix |
| R-03 | Regresse nach Setup-Anpassung (2.0.1) | Harte Start-Smoke-Checks und UI-ID-Prüfung |
| R-04 | Große gemeinsame IIFE und UI-Modul-Kopplung | Messbasiertes Refactoring, keine Architekturänderung ohne Tests |
| R-05 | Speicher- oder Backupverlust bei Updates | Roundtrip-/Migrationsszenarien und Schemakompatibilität |
| R-06 | Browser-Code besitzt Session-Rechte | Security-Review, vertrauenswürdige Installationsquelle, keine Secrets |
| R-07 | Releaselogik an feste Versionen gebunden | Generische, freigabegesteuerte Pipeline |
| R-08 | Private Repository-Sichtbarkeit vs. Open-Source-Darstellung | Veröffentlichung und externe Contributions separat entscheiden |

## 8. Metriken und Transparenz

Pro Release erfassen: bekannte Blocker (Ziel 0), Anteil erfolgreicher verpflichtender Gates (Ziel 100 %), ungeklärte CalDAV-Teilfehler (Ziel 0 vor Freigabe), Build-Reproduzierbarkeit (Ziel exakt), Regressionen, tatsächlich getestete Plattformkombinationen, JS-/Installer-Größe, wahrgenommene Startzeit und Qualitätsabweichungen.

Performancebudgets werden erst **nach Baseline-Messung** verbindlich. Ein geringerer Dateiumfang rechtfertigt keine instabilen Builds. Nicht gemessene Werte werden als offen gekennzeichnet.

## 9. Reihenfolge der nächsten Schritte

1. #1 abschließen, insbesondere Testinventar und Baseline-Commit mit tatsächlicher Evidenz.
2. #2 und #4 zusammen planen, Test- und Freigabematrix festlegen.
3. #3 umsetzen, allerdings erst nach gesonderter Freigabe den Publish-Mechanismus auf main ändern.
4. 2.0.3 nur bei vollständigen Release-Gates freigeben.
5. Dann #5–#8 mit eigenständigen Analyse- und Umsetzungsschritten.
6. #9 als bewusst getrennte Architektur- und Produktentscheidung behandeln.

**Änderungsvorbehalt:** Dieses Dokument steuert die Entwicklung. Es erteilt keine pauschale Freigabe für CalDAV-Schreibtests gegen reale Server, Veröffentlichung des Repositories oder technische Funktionsänderungen.
