# Änderungsprotokoll

## 2.0.5 – veröffentlicht am 06.11.2026: organisationsneutrale Veröffentlichung

- Sichtbare und kommentierte Beispiele aus einem früheren projektspezifischen Einsatz durch neutrale Bezeichnungen ersetzt.
- Installer, Bookmarklet-URL und JavaScript-Bundle aus der aktuellen Quelle neu erzeugt; bestehendes UI-Verhalten, lokales Datenformat und CalDAV-Logik unverändert.
- Historische QA-Texte von konkreten Beispielkennungen bereinigt und frühere Qualitätsnachweise präzisiert.
- Verbindliche Datenschutz-/Neutralitätsprüfung in CI und Release-Pipeline; sie erfasst auch URL-kodierte Inhalte in generierten Dateien und verhindert versehentliche Aufnahme persönlicher Exportdateien.
- Ältere Tags bleiben für Nachvollziehbarkeit unverändert; die Veröffentlichungshistorie und ihre Grenzen sind dokumentiert.


## 2.0.4 – veröffentlicht am 06.11.2026

- Vollständige Überarbeitung der Installer-HTML mit modernem, responsivem Layout und klaren Installationsanweisungen.
- Sichtbare Versionsangaben aus der Entwicklungsquelle abgeleitet; veraltete Beta-Hinweise entfernt.
- Drag-and-drop und manuelle Copy/Paste-Installation mit Codebox, Clipboard-API und Fallback.
- Pflege der Installer-Vorlage getrennt von den generierten Installationsartefakten; reproduzierbarer Build.
- Automatisierte Konsistenz- und Browser-Prüfung auf Desktop- und Mobilbreite.
- Keine Änderungen an Funktionen, Datenmodell, Browser-Speicherkennungen oder CalDAV-Verhalten innerhalb der Anwendung.


## 2.0.3 – veröffentlicht am 05.11.2026

- CalDAV-Regressionssuite für schreibfreie Prüfung, unvollständige und ungültige Zuordnungen, abgelehnte Übernahme und Rücknahmeversuche bei Teilfehlern.
- Verpflichtende Playwright-Prüfungen in GitHub Actions erweitert.
- Freigabegesteuerte Release-Pipeline mit unveränderlichem Tag, versionierten Assets und verifizierten SHA-256-Prüfsummen.
- Dynamische Versionsprüfung im Build-Konsistenztest.
- QA- und Kompatibilitätsnachweise für 2.0.3 mit ausdrücklich offener Live-Abnahme.
- Keine Änderung an Fachfunktionen, Oberfläche, Konfigurationsschema oder CalDAV-Verhalten.


## 2.0.2 – 04.11.2026

- **Hotfix:** Fehlender Button `saved-manager-discard` im Setup ergänzt. Dadurch wird der JavaScript-Abbruch beim Start behoben.
- „Speichern“ und „Verwerfen“ stehen im Setup-Editor wieder korrekt zur Verfügung.
- Release-Prüfung um die Validierung sämtlicher statischer HTML-IDs und einen Browser-Starttest erweitert.
- Keine Änderungen am JSON-Schema, an bestehenden Profilen oder an serverseitiger CalDAV-Logik.

## 2.0.1 – 04.11.2026

**Bekannter Fehler:** 2.0.1 kann beim Öffnen ein unvollständiges, nicht schließbares Fenster anzeigen. Bitte 2.0.2 verwenden.

- **Setup → Profile & Sortier-Sets**: neue Profile und Sortier-Sets direkt erstellen, vorhandene Einträge duplizieren.
- Zuordnung einzelner Kalender über Checkboxen, Suche und Mehrfachfilter.
- Dynamische Profile mit Bereichen, Kalenderarten und zusätzlichen Kalenderquellen bearbeiten.
- Sortier-Sets mit Pfeiltasten, Drag-and-drop und Positionsfixierungen bearbeiten.
- Entwurfsmodus mit Speichern/Verwerfen; keine Veränderung aktiver Kalender oder serverseitiger Sortierung.
- JSON-Schema 1 und bisherige Speicherkennungen bleiben unverändert; 18 von 18 lokalen Qualitätstests bestanden.

Weitere Informationen: [Release Notes 2.0.1](docs/releases/v2.0.1.md).

## 2.0.0 – 04.11.2026

- Veröffentlichung des Projekts unter der MIT-Lizenz; Beitragsrichtlinien für Forks und Pull Requests ergänzt.

Stabile Veröffentlichung auf Basis der produktiv geprüften Beta 15.

- Einheitlicher Produktname **Kalenderprofile**; „Nextcloud“ wird im Untertitel als Plattform genannt.
- Persistenzkorrektur für den bevorzugten Bereich nach JSON-Import oder Kennungsänderung.
- Abwärtskompatibilität mit den bisherigen lokalen Einstellungen und JSON-Exporten.
- Release-QA: 17 von 17 Prüfungen erfolgreich (siehe `docs/RELEASE_QA.md`).
- Quellcode, CSS, HTML, Installer und Build-Prozess sind Teil des Repositories.

## Entwicklungsmeilensteine (2.0.0-Betas)

- **Beta 15:** Konsolidierte Modulstruktur, verbesserte CalDAV-Validierung und Fehlerbehandlung, gezieltes Rendering.
- **Beta 14:** Temporäre Freigabe fixierter Kalender.
- **Beta 13:** Sammelauswahl der sichtbaren Kalender.
- **Beta 12:** Kombinierbare Mehrfachfilter in der Einzelauswahl.
- **Beta 11:** Einheitliche Aktionen und kontextabhängige Setup-Fußzeilen.
- **Beta 10:** Zentrale Profil-/Sortier-Set-Verwaltung und konsolidiertes Setup.
- **Beta 9:** Unterreiter im Setup und verbesserte Bereichsvorschläge.
- **Beta 8:** Vorschlagserkennung auf ausdrücklichen Benutzerwunsch.
- **Beta 7:** Schlüsselwort-Wildcards und Ausschlussmuster.
- **Beta 5–6:** Bearbeitbare Bereichs-/Typkennungen und Referenzübernahme.
- **Beta 2–4:** Editierbare Bereiche/Kalenderarten, Importkompatibilität, Systemkalender-Erkennung.

Ein früheres, getrennt entwickeltes Projekt ist nicht Bestandteil dieses generischen Repositories.
