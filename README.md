# Kalenderprofile

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Free & Open Source · Contributions welcome!**

**Aktuelles veröffentlichtes Release:** [2.0.5](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/tag/v2.0.5) – 06.11.2026    
Kalenderverwaltung für Nextcloud

Browser-Bookmarklet zur Verwaltung von Kalenderprofilen, Schnellansichten, Kategorien, Bereichs- und Kalenderartfiltern sowie Kalenderreihenfolgen in der Nextcloud-Kalender-App.

## Installation

**Empfohlen:** Unter [Releases](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases) die passende Datei `kalenderprofile-vX.Y.Z-installation.html` im Bereich **Assets** herunterladen. Diese HTML-Datei **lokal in Chrome oder Edge öffnen** und entweder den Link **Kalenderprofile** in die Lesezeichenleiste ziehen oder die vollständige Bookmarklet-Adresse über **Code kopieren** als URL eines Lesezeichens einfügen. Danach die Nextcloud-Kalender-App öffnen und das Lesezeichen anklicken. Die GitHub-Dateivorschau und die automatisch generierten Quellcode-Archive sind keine unmittelbar ausführbare Installationsseite.

Alternativ lässt sich die Datei `install/installation.html` aus dem vollständig heruntergeladenen Repository lokal öffnen.

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
python tests/test_repo_neutrality_205.py
```

Die Build-Skripte erzeugen `src/calendar-management-generic.js`, `install/bookmarklet-url.txt` und `install/installation.html` aus den Entwicklungsdateien und der gepflegten Vorlage `install/installer-template.html`. Die sichtbare Installer-Version und beide Installationswege verwenden immer die Versionskennung bzw. Bookmarklet-Adresse aus derselben Quelle. Das ausgelieferte Bookmarklet hat keine externen Laufzeitabhängigkeiten. Die automatisierten Tests verwenden Playwright/Chromium. Version 2.0.3 ergänzt simulierte CalDAV-Fehlerfalltests; reale Nextcloud-Abnahmen werden separat dokumentiert.

## Kompatibilität und Sicherheit

Für 2.0.3 sind automatisierte Browser- und simulierte CalDAV-Tests sowie eine positive manuelle Funktionsprüfung dokumentiert. Eine versionsübergreifende Kompatibilitätsgarantie für sämtliche Nextcloud- und Browser-Versionen gibt es nicht.

Die CalDAV-Sortierung schreibt nach ausdrücklicher Benutzerfreigabe in die Nextcloud. Änderungen über mehrere Kalender sind nicht atomar; im Fehlerfall erfolgt ein Wiederherstellungsversuch. JSON-Exporte können Kalendernamen und weitere benutzerspezifische Angaben im Klartext enthalten.

## Lizenz und Mitmachen

Kalenderprofile ist **kostenlos und Open Source** unter der [MIT-Lizenz](LICENSE). Nutzung, Anpassung, Forks, Weitergabe und kommerzielle Nutzung sind gestattet; der Lizenz- und Urheberrechtshinweis muss bei Weitergabe erhalten bleiben.

**Beiträge sind willkommen:** Fehlerberichte, Vorschläge, Übersetzungen und Pull Requests. Hinweise findest du in [CONTRIBUTING.md](CONTRIBUTING.md).

Copyright © 2026 Matthias Ebermann-Kestel.

## Projektsteuerung und Roadmap

Die aktuelle Entwicklungsplanung mit Prioritäten, offenen Risiken und Abnahmekriterien steht im [Projektplan](docs/PROJECT_PLAN.md). Der [Entwicklungs- und Releaseprozess](docs/RELEASE_PROCESS.md) beschreibt Pull Requests, Qualitätssicherung, Freigaben und Hotfixes. Die Umsetzung wird über [GitHub Issues](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues) verfolgt.

## Veröffentlichte Versionen und ältere Artefakte

Bis einschließlich 2.0.4 enthalten historische Quell- und Release-Stände einzelne organisationsbezogene Beispielkennungen und Texte. In der Prüfung wurden keine produktiven Kalenderexporte oder Zugangsdaten im aktuellen Projekt nachgewiesen. Die früheren, unveränderlichen Git-Tags und Release-Pakete bleiben zu Prüf- und Reproduzierbarkeitszwecken erhalten. Für neue Installationen wird die bereinigte Version 2.0.5 empfohlen. Weitere Informationen: [Umgang mit älteren Release-Artefakten](docs/RELEASE_HISTORY_POLICY.md).

- [2.0.5 – Organisationsneutrale Bereinigung](docs/releases/v2.0.5.md)
- [2.0.4 – Neue Installationsoberfläche](docs/releases/v2.0.4.md)
- [2.0.3 – Stabilisierung und Release-Sicherheit](docs/releases/v2.0.3.md)
- [2.0.2 – Start-Hotfix](docs/releases/v2.0.2.md)
- [2.0.1 – Erweiterter Profil- und Sortier-Set-Editor](docs/releases/v2.0.1.md)
- [2.0.0 – Stabile Erstveröffentlichung](docs/releases/v2.0.0.md)
