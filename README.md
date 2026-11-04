# Kalenderprofile

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Free & Open Source · Contributions welcome!**

**Version:** 2.0.1 (04.11.2026)  
Kalenderverwaltung für Nextcloud

Browser-Bookmarklet zur Verwaltung von Kalenderprofilen, Schnellansichten, Kategorien, Bereichs- und Kalenderartfiltern sowie Kalenderreihenfolgen in der Nextcloud-Kalender-App.

## Installation

**Empfohlen:** Unter [Releases](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases) die passende Datei `kalenderprofile-vX.Y.Z-installation.html` im Bereich **Assets** herunterladen. Diese HTML-Datei **lokal in Chrome oder Edge öffnen**, den Link **Kalenderprofile** in die Lesezeichenleiste ziehen, die Nextcloud-Kalender-App aufrufen und das Lesezeichen anklicken. Die GitHub-Dateivorschau und die automatisch generierten Quellcode-Archive sind keine unmittelbar ausführbare Installationsseite.\n\nAlternativ lässt sich die Datei `install/installation.html` aus dem vollständig heruntergeladenen Repository lokal öffnen.

Der Installer und das Bookmarklet enthalten den vollständigen JavaScript-Code. Es sind weder ein externer Loader noch zusätzliche Nextcloud-Apps erforderlich.

## Funktionen

- Profile, dynamische Filter und Schnellansichten
- Konfigurierbare Bereiche, Kalenderarten und Schlüsselwortregeln mit Wildcards und Ausschlüssen
- Einzelauswahl mit Textsuche und Mehrfachfiltern
- Temporär lösbare Fixierungen und Sammelauswahl
- Sortier-Sets und bestätigte CalDAV-Sortierung
- Lokale JSON-Sicherung und Wiederherstellung
- Eigenständige, isolierte Oberfläche im Kalender

## Entwicklung und Tests

```bash
python scripts/build.py
python tests/check_release.py
```

Die Build-Skripte erzeugen `src/calendar-management-generic.js`, `install/bookmarklet-url.txt` und `install/installation.html` aus den Entwicklungsdateien. Das ausgelieferte Bookmarklet hat keine externen Laufzeitabhängigkeiten. Die automatisierten Tests verwenden teilweise Playwright/Chromium.

## Kompatibilität und Sicherheit

Die Software wurde in einer produktiven Nextcloud-Instanz mit der Beta-15-Basis geprüft und für 2.0.0 freigegeben; die Release-QA umfasst 17 erfolgreiche Prüfungen. Eine versionsübergreifende Kompatibilitätsgarantie für alle Nextcloud-Kalender-Versionen gibt es nicht.

Die CalDAV-Sortierung schreibt nach ausdrücklicher Benutzerfreigabe in die Nextcloud. Änderungen über mehrere Kalender sind nicht atomar; im Fehlerfall erfolgt ein Wiederherstellungsversuch. JSON-Exporte können Kalendernamen und weitere benutzerspezifische Angaben im Klartext enthalten.

## Lizenz und Mitmachen

Kalenderprofile ist **kostenlos und Open Source** unter der [MIT-Lizenz](LICENSE). Nutzung, Anpassung, Forks, Weitergabe und kommerzielle Nutzung sind gestattet; der Lizenz- und Urheberrechtshinweis muss bei Weitergabe erhalten bleiben.

**Beiträge sind willkommen:** Fehlerberichte, Vorschläge, Übersetzungen und Pull Requests. Hinweise findest du in [CONTRIBUTING.md](CONTRIBUTING.md).

Copyright © 2026 Matthias Ebermann-Kestel.

## Releases

- [2.0.1 – Erweiterter Profil- und Sortier-Set-Editor](docs/releases/v2.0.1.md)
- [2.0.0 – Stabile Erstveröffentlichung](docs/releases/v2.0.0.md)
