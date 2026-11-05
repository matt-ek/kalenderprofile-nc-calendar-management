# Entwicklungs- und Releaseprozess – Kalenderprofile

**Status:** Zielprozess, eingeführt als Planungsdokument am 05.11.2026. Er ersetzt die derzeitige technische Publish-Automation erst nach Umsetzung von [Issue #3](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues/3).

## 1. Grundregeln

- main enthält ausschließlich geprüfte, integrationsfähige Änderungen.
- Für jede Änderung wird ein eigener Branch verwendet: fix/..., feat/..., refactor/..., test/... oder docs/....
- Jeder Pull Request referenziert ein Issue, dokumentiert Risiken und listet tatsächliche Tests auf.
- Kein automatisches Zusammenfassen von Featureentwicklung und großflächigem Refactoring.
- Direkte Änderungen an Release-Tags oder nachträglicher Austausch bereits veröffentlichter Artefakte sind untersagt. Eine Korrektur erfolgt als neues Patch-Release.
- Produktiv-Nutzerkonfigurationen und CalDAV-Operationen sind geschützte Kompatibilitätsgrenzen.
- Keine produktiven Zugangsdaten, Cookies, Tokens, personenbezogenen Kalendernamen oder persönlichen JSON-Backups in GitHub.

## 2. Versionierung

Angelehnt an Semantic Versioning, bezogen auf das beobachtbare Produktverhalten:

- **Patch (2.0.x):** Bugfix, Test-/Sicherheitsverbesserung oder interne Wartung ohne beabsichtigte Änderung von Funktionen und Datenformat.
- **Minor (2.x.0):** Abwärtskompatible neue Funktion oder ausdrücklich genehmigte UI-Erweiterung.
- **Major (x.0.0):** Beabsichtigte inkompatible Änderung mit zwingender Migrationsstrategie und Freigabe.

Die Versionsangaben in Dokumentation, Bundle, Installer, Release Notes und Tag müssen identisch sein. Technische Speicher-IDs dürfen nicht bloß wegen einer neuen semantischen Version umbenannt werden. Diese Regel ist eine Zielvorgabe; die aktuell hart kodierte Versionsprüfung wird in Issue #3 generalisiert.

## 3. Pull-Request-Prüfung

Ein PR ist bereit, wenn Folgendes erkennbar ist:

1. Warum ist die Änderung erforderlich, welches Issue wird gelöst?
2. Was ändert sich, und was bleibt ausdrücklich unverändert?
3. Wirkt die Änderung auf Fachlogik, UI/UX, persistente Daten, CalDAV oder Installation?
4. Welche automatisierten und manuellen Tests liefen tatsächlich, mit Ergebnis?
5. Gibt es neue Abhängigkeiten, Datenschutzrisiken, Rollback-Bedarf oder offene Findings?
6. Sind bei Quellcodeänderungen generiertes Bundle und Installer nachweislich synchron?

Empfohlen ist mindestens ein Review durch eine zweite Person, wenn verfügbar. Wo nur eine Person entwickelt, sind ein strukturierter Selbstreview und Testnachweise verpflichtend; ein zweiter Review ist für kritische CalDAV-/Persistenzänderungen anzustreben.

## 4. Technische Abnahme

### Jeder Code-PR

- Reproduzierbaren Build erzeugen und generierte Dateien auf Gleichheit prüfen.
- Node-Syntaxcheck, vorhandene Release-Konsistenzchecks und Browser-Startprüfung ausführen.
- Bei UI-Änderungen Dialog öffnen, schließen und relevante Interaktionen sowie Tastatur- und Fokusverhalten testen.
- Bei Persistenzänderungen Migration/Export/Import samt beschädigten Eingaben testen.
- Bei CalDAV-Änderungen Fehlerfall-Matrix einschließlich Abbruch, Teilfehler und Wiederherstellungsversuch durchlaufen.
- Prüfen, ob HTML-IDs und JavaScript-Referenzen konsistent sind.
- Tatsächliche Resultate in PR und CI dokumentieren.

### Release-Kandidat

- Vollständige Gates aus [PROJECT_PLAN.md](PROJECT_PLAN.md) verwenden.
- Testmatrix dokumentieren: Browser, Betriebssystem, Nextcloud-Serverversion, Kalender-App-Version, Testart, Ergebnis.
- Mindestens eine kontrollierte reale Kompatibilitätsprüfung nur auf dafür autorisierter Instanz und mit Dummy-Daten durchführen; Schreibtest ausschließlich nach ausdrücklicher Freigabe.
- Bekannte Einschränkungen offen in Release Notes beschreiben.

## 5. Veröffentlichung

**Sollprozess nach Issue #3:**

1. Release-Issue und vollständige Checkliste vorbereiten; Go/No-Go festhalten.
2. Versionskonsistenz in Quelltext, Installer, Dokumentation und Release Notes verifizieren.
3. Tag auf getesteten Commit setzen; Tag/Commit eindeutig dokumentieren.
4. CI mit unveränderlichen Quellen ausführen; fehlgeschlagene Gates blockieren den Release.
5. Versionierte Installations-HTML, Quellpaket und SHA-256-Prüfsummen erstellen.
6. Artefakte auf Vollständigkeit prüfen und lokal aus dem veröffentlichten Installer starten.
7. Release Notes veröffentlichen: Highlights, Fixes, Migration, Kompatibilität, bekannte Grenzen, Installation.
8. Downloadlinks und Prüfsummen kontrollieren, erst danach Freigabe kommunizieren.

**Wichtig:** Im aktuell vorhandenen Workflow sind Versionen und ein main-/Workflow-Datei-Trigger noch fest kodiert. Die vorstehenden Punkte sind daher erst nach Umsetzung und Verifikation von #3 als automatisierter Standard anzusehen.

## 6. Hotfix und Rollback

- Produktionsfehler per Issue priorisieren; bei Startblockern und potenziellen unautorisierten Serveränderungen: P0.
- Letztes nachweislich funktionierendes Installationsasset bereitstellen; Nutzerinformation über Versionsstand und eventuellen Datenzustand.
- Für den Fix separaten Branch/PR, gezielte Regression und neue Patch-Version nutzen.
- Serveränderungen über CalDAV sind nicht garantiert atomar oder automatisch rückrollbar. Bei unklarem Zustand Anwender zur Kontrolle im Nextcloud-Kalender auffordern.
- Keine automatische Wiederherstellung aus privatem JSON ohne Prüfung und Benutzerentscheidung.

## 7. Definition of Done

Eine Entwicklungsaufgabe ist erledigt, wenn die Akzeptanzkriterien erfüllt, relevante Tests nachweislich erfolgreich, Dokumentation und Tests angepasst, Review abgeschlossen und der PR integriert sind. Eine Releaseaufgabe ist erst mit überprüften Release-Assets, Release Notes und ausdrücklichem Go abgeschlossen.

## 8. Planungs- und Evidenzquellen

- [Projektplan](PROJECT_PLAN.md)
- [Systemarchitektur](ARCHITECTURE.md)
- [2.0.2 QA](RELEASE_QA_2.0.2.md)
- [Änderungsprotokoll](../CHANGELOG.md)
- [Beitragsregeln](../CONTRIBUTING.md)

Berichte über frühere Testläufe dürfen nicht mit einem aktuellen, selbst ausgeführten Test gleichgesetzt werden.
