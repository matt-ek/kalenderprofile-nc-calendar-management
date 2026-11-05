# Öffentliche Veröffentlichungshistorie und Datenschutz

## Entscheidung

Das Repository **bleibt öffentlich**. Die bereits veröffentlichten Git-Tags und Release-Dateien von Version 2.0.0 bis einschließlich 2.0.4 bleiben unverändert und werden nicht nachträglich überschrieben, um Integrität, Prüfsummen und Reproduzierbarkeit nicht zu brechen. Der neutrale Nachfolger ist Version 2.0.5.

## Historischer Befund

In älteren Quelltextkommentaren, einer Eingabefeld-Vorbelegung und Dokumentationsstellen wurden Beispielbezeichnungen aus einem vorangegangenen organisationsspezifischen Projekt verwendet. Diese Inhalte sind auch in älteren generierten Bookmarklet-Bundles und Installationsdateien vorhanden.

In der durchgeführten Sichtprüfung der aktuell verfolgten Dateien, bestehenden Release-Tags, Beispielkonfigurationen sowie abrufbaren Issue- und PR-Texten wurden **keine vollständigen produktiven Kalenderexporte, Zugangsdaten oder kundenspezifischen Server-URLs nachgewiesen**. Das ist keine vollständige forensische Bestätigung sämtlicher historischer Zwischenstände, fremder Forks oder zwischengespeicherter Kopien.

## Maßnahmen

1. Neue Softwarestände ersetzen sämtliche gefundenen spezifischen Demo- und Hilfstexte durch neutrale Beispiele.
2. Ein verbindlicher CI-Check prüft verfolgte Quell-, Dokumentations- und Auslieferungsdateien, auch mehrfach URL- bzw. HTML-dekodiert, und meldet nur Dateinamen und Regelklassen. Der Check verhindert die versehentliche Aufnahme einschlägiger Kalender- oder Exportformate.
3. Das geprüfte Patch-Release 2.0.5 wird als neue, unveränderliche Version veröffentlicht; neue Installationen sollen die aktuelle Version verwenden.
4. Die alten Releases bleiben öffentlich abrufbar, gelten jedoch hinsichtlich der organisationsneutralen Beispiele als **abgelöst**. Diese Einstufung bedeutet nicht automatisch, dass die alten Versionen funktionsunfähig sind.
5. Frühere Git-Tags, Assets oder Commits werden **nicht** umgeschrieben oder gelöscht. Ein nachträgliches Umschreiben könnte Integritätsnachweise, bestehende Installationen, Links, Clones und Prüfsummen brechen und die bereits erfolgte öffentliche Sichtbarkeit ohnehin nicht zuverlässig rückgängig machen.

## Grenzen und Reaktion auf neue Befunde

- Die CI-Prüfung schützt den jeweils aktuellen Repositorystand; sie kann alte Tags, externe Clones, Caches oder Downloads nicht aus der Welt entfernen.
- Falls später tatsächliche Geheimnisse oder sensible Personendaten gefunden werden, ist das ein gesonderter Sicherheitsvorfall: betroffene Berechtigungen beziehungsweise Tokens unverzüglich widerrufen/rotieren, betroffene Personen und erforderliche Meldungen prüfen und erst danach eine gezielte Git-/Release-Bereinigung entscheiden.
- Lizenz- und Copyright-Urheberangaben sind bewusst nicht mit organisationsbezogenen Kalenderdaten gleichgesetzt.
- Die Prüfung wird regelmäßig erweitert, wenn weitere projektspezifische Muster bekannt werden.
