# Öffentliche Veröffentlichungshistorie und Datenschutz

## Aktuelle Entscheidung und Umsetzung

Das Repository **bleibt öffentlich**. Auf ausdrücklichen Wunsch des Repository-Eigentümers wurden am **06.11.2026** alle fünf historischen GitHub-Releases der Versionen **2.0.0 bis 2.0.4 einschließlich ihrer Git-Tags entfernt**. Der einzige verbliebene veröffentlichte Git-Tag und Release ist **v2.0.5**.

Die Entfernung erfolgte über einen einmaligen freigegebenen GitHub-Actions-Workflow mit strenger Positivliste und Prüfung der ursprünglichen Tag-Commit-Hashes. Das [erfolgreiche Ausführungsprotokoll](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42132262033) dokumentiert die Entfernung und die nachfolgende Prüfung der Abwesenheit der fünf Releases und Tags. Die unveränderte Version 2.0.5 war gegen Löschung geschützt. Der temporäre Workflow wird nach der Ausführung aus dem aktuellen Repository-Baum entfernt.

## Historischer Befund

In älteren Quelltextkommentaren, einem Eingabefeld-Platzhalter und Dokumentationsstellen waren konkrete Bezeichnungen aus einer früheren organisationsspezifischen Anwendung enthalten. Diese Hinweise waren auch in alten generierten JavaScript-Bundles und Installer-Dateien zu finden. Die öffentlich angebotene Nachfolgeversion 2.0.5 verwendet neutrale Beispiele.

Bei der Prüfung der damals aktuellen Dateien und der über GitHub abrufbaren Versionen wurden keine vollständigen produktiven Kalenderexporte, Zugangsdaten oder kundenspezifischen Server-URLs nachgewiesen. Das ist keine vollständige forensische Untersuchung aller historischen Commits, externen Forks oder Kopien.

## Wirkung der Entfernung

- Die regulären GitHub-Release-Downloads und die fünf zugehörigen Tag-Referenzen stehen nicht mehr zur Verfügung.
- Alle drei Release-Assets von 2.0.5 und dessen Tag wurden bei der Löschung erneut überprüft und bleiben erhalten.
- Das Repository bleibt öffentlich, die Programmfunktionen und die aktuelle Codebasis bleiben unverändert.
- Der CI-Check für organisationsspezifische Inhalte bleibt für neue Änderungen und Releases aktiviert.

## Verbleibende historische Informationen

- **Git-Commit-Historie und frühere Branches:** nicht umgeschrieben. Alter Quellcode kann über alte Commits oder Klone weiterhin erreichbar sein.
- **Bereits heruntergeladene Dateien, externe Forks und Caches:** werden durch das Löschen von GitHub-Releases nicht entfernt.
- **Release-Notizen und Changelog im Repository:** bleiben als historische Dokumentation erhalten; die Erwähnung älterer Versionen bedeutet nicht, dass diese noch als GitHub-Release angeboten werden.

Falls nachträglich echte Geheimnisse oder sensible personenbezogene Daten nachgewiesen werden, sind betroffene Berechtigungen beziehungsweise Tokens gesondert zu widerrufen und eine zielgerichtete Sicherheitsprüfung einzuleiten. Das Löschen von Releases allein wäre dann keine ausreichende Maßnahme.
