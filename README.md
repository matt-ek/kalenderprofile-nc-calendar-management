# Kalenderprofile

**Mehr Übersicht in der Nextcloud-Kalender-App.**

Kalenderprofile ist ein kostenloses Open-Source-**Bookmarklet**, mit dem sich viele Nextcloud-Kalender schneller auswählen, in persönlichen Ansichten zusammenfassen und übersichtlich sortieren lassen. Besonders nützlich ist es, wenn mehrere Teams, Projekte oder Ressourcen eigene Kalender verwenden.

[![Aktuelle Version](https://img.shields.io/badge/Release-2.0.5-176da5)](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/tag/v2.0.5)
[![MIT-Lizenz](https://img.shields.io/badge/Lizenz-MIT-64748b)](LICENSE)
[![Build and quality checks](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/workflows/quality.yml/badge.svg)](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/workflows/quality.yml)

**[Installer für Version 2.0.5 herunterladen](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/download/v2.0.5/kalenderprofile-v2.0.5-installation.html)** · [Release & weitere Downloads](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/tag/v2.0.5) · [Fehler oder Idee melden](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/issues)

## Was bringt Kalenderprofile?

Die normale Nextcloud-Kalenderansicht bleibt erhalten. Kalenderprofile ergänzt sie um eine eigene Bedienoberfläche, in der sich häufig benötigte Kalenderkombinationen speichern und wieder aufrufen lassen.

| Bereich | Möglichkeiten |
| --- | --- |
| **Profile & Filter** | Kalender nach frei definierbaren Bereichen, Kalenderarten und Herkunft auswählen; persönliche Profile und Schnellansichten wiederverwenden. |
| **Einzelauswahl** | Einzelne Kalender über Suche und kombinierbare Mehrfachfilter finden, an- oder abwählen und die Auswahl übernehmen. |
| **Sortierung** | Eigene Sortier-Sets verwalten und die Reihenfolge von Kalendern mit gesonderter Bestätigung über CalDAV übernehmen. |
| **Setup** | Bereiche, Kalenderarten, Erkennungsregeln, Schnellansichten, gespeicherte Profile und Sortier-Sets konfigurieren. |
| **Sichern & Wiederherstellen** | Einstellungen über JSON exportieren und bei Bedarf wieder importieren. |

Erkennungsregeln unterstützen Schlüsselwörter, Platzhalter (`*`) und Ausschlüsse. Die Zuordnung lässt sich an unterschiedliche Namenskonventionen anpassen. Kalender aus persönlichen, geteilten sowie unterstützten Nextcloud-Quellen wie Deck und Aufgaben können in die Auswahl einbezogen werden.

Typische Einsatzfälle sind beispielsweise eine kompakte Ansicht aller Projekttermine, ein Wechsel zwischen Team- und Ressourcenkalendern oder eine persönliche Auswahl aus einer umfangreichen Kalenderliste.

## In wenigen Schritten installieren

**Voraussetzung:** Du hast Zugriff auf eine Nextcloud-Instanz mit Kalender-App und verwendest einen Desktop-Browser wie Chrome oder Edge. Die automatisierten Browsertests nutzen Chromium; eine vollständige Kompatibilitätsprüfung aller Browser- und Nextcloud-Versionen liegt nicht vor.

1. **[Installer-HTML herunterladen](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/download/v2.0.5/kalenderprofile-v2.0.5-installation.html)** und die heruntergeladene Datei **lokal im Browser öffnen**. Die GitHub-Dateivorschau ist nicht die ausführbare Installationsseite.
2. **Bookmarklet anlegen:** Entweder die Schaltfläche **„Kalenderprofile“** aus der Installationsseite in die Lesezeichenleiste ziehen **oder** mit **„Code kopieren“** die vollständige `javascript:`-Adresse kopieren und als URL eines neuen Lesezeichens einfügen.
3. In Nextcloud die **Kalender-App** öffnen und das neue Lesezeichen anklicken.
4. In Kalenderprofile die gewünschten Kalender auswählen, eine Ansicht speichern oder zunächst unter **Setup** eigene Kategorien und Erkennungsregeln definieren.

Das Bookmarklet enthält die Anwendung vollständig. Es benötigt **keine zusätzliche Nextcloud-App**, keine Browser-Erweiterung und keinen externen JavaScript-Loader. Die Installer-HTML muss nicht auf den Nextcloud-Server hochgeladen werden.

**Aktualisieren:** Bei einer neuen Version das bestehende Bookmarklet durch die neue Adresse ersetzen.

## Die vier Arbeitsbereiche

**Profile & Filter:** Über Schnellansichten, gespeicherte Profile sowie Bereichs- und Kalenderartfilter werden zusammengehörige Kalender in einer Ansicht gebündelt. Vor der Übernahme lässt sich die Auswahl überprüfen.

**Einzelauswahl:** Suche und Filter helfen beim gezielten Ein- oder Ausblenden einzelner Kalender. Fixierte Kalender können für die laufende Sitzung vorübergehend von ihrer Fixierung ausgenommen werden.

**Sortierung:** Häufig benötigte Reihenfolgen können als Sortier-Sets gespeichert werden. Änderungen an der serverseitigen Kalenderreihenfolge werden gesondert geprüft und bestätigt.

**Setup:** Hier werden die Klassifikation, eigene Schnellansichten, Profile, Sortier-Sets und der JSON-Import/-Export verwaltet. Die Einrichtung ist nicht auf eine bestimmte Organisation oder vordefinierte Kalendernamen beschränkt.

*Abbildungen der tatsächlichen Oberfläche werden ergänzt, sobald geeignete, anonymisierte Screenshots vorliegen.* 

## Sicherheit und Datenschutz

Kalenderprofile wird **innerhalb der bereits geöffneten Nextcloud-Sitzung** ausgeführt und verfügt damit über die Rechte dieser Sitzung. Installiere ein Bookmarklet deshalb nur aus einer vertrauenswürdigen Quelle und prüfe bei Bedarf den veröffentlichten Quellcode.

- **Lokale Einstellungen:** Profile und Konfigurationen werden im Browserspeicher der jeweiligen Nextcloud-Instanz und des Benutzers gehalten. JSON-Exporte können Kalendernamen, IDs und weitere benutzerspezifische Informationen **im Klartext** enthalten. Solche Dateien nicht unbereinigt öffentlich teilen.
- **CalDAV:** Eine Änderung der Kalenderreihenfolge erfordert eine ausdrückliche Bestätigung. Die Anwendung führt davor Prüfungen durch; Änderungen über mehrere Kalender sind jedoch **nicht atomar**. Bei einem Teilfehler muss die Reihenfolge gegebenenfalls direkt in Nextcloud kontrolliert werden.
- **Tests und Grenzen:** Die [automatisierten Qualitätsprüfungen zu 2.0.5](docs/RELEASE_QA_2.0.5.md) umfassen unter anderem Browser-, Installer-, Build-, CalDAV-Simulations- und Neutralitätsprüfungen. Sie ersetzen **keine vollständigen Live-Tests** aller Nextcloud- und Browser-Versionen.

## Entwicklung

Die bearbeitbaren Quellen liegen in `src/parts/` (JavaScript) und `src/assets/` (HTML/CSS). `scripts/build.py` erzeugt daraus das eigenständige Bundle, die Bookmarklet-URL und den Installer. Generierte Dateien gehören zum Repository; sie sollten nicht unabhängig von ihren Quellen bearbeitet werden.

Für den lokalen Build und die grundlegenden Prüfungen werden **Python 3** und **Node.js** benötigt:

```bash
python scripts/build.py
python tests/check_release.py
python tests/test_repo_neutrality_205.py
```

Die vollständige GitHub-CI führt darüber hinaus Browser- und simulierte CalDAV-Regressionstests aus. Für diese Tests sind zusätzliche Playwright-/Chromium-Abhängigkeiten erforderlich.

**Dokumentation:** [Architektur](docs/ARCHITECTURE.md) · [Release-Prozess](docs/RELEASE_PROCESS.md) · [Projektplan & Roadmap](docs/PROJECT_PLAN.md) · [Changelog](CHANGELOG.md) · [Release Notes 2.0.5](docs/releases/v2.0.5.md)

## Mitmachen und Lizenz

Fehlerberichte, Vorschläge und Pull Requests sind willkommen. Bitte beachte die [Beitragsrichtlinien](CONTRIBUTING.md) und veröffentliche in Issues oder Screenshots **keine privaten Kalenderdaten, Zugangsdaten oder persönlichen JSON-Exporte**.

Kalenderprofile steht unter der [MIT-Lizenz](LICENSE). Nutzung, Anpassung, Weitergabe und kommerzielle Nutzung sind im Rahmen der Lizenz möglich.

Die aktuell angebotene Version ist **2.0.5**. Frühere GitHub-Releases und ihre Tags wurden aus dem öffentlichen Downloadbereich entfernt; ältere Commits und außerhalb von GitHub gespeicherte Kopien können weiterhin existieren. Näheres erläutert die [Veröffentlichungshistorie](docs/RELEASE_HISTORY_POLICY.md).

© 2026 Matthias Ebermann-Kestel
