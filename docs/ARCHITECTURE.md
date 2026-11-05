# Architektur – Kalenderprofile

Stand: V2.0.4 (Installer-Release-Kandidat). Dies ist die Entwicklungsstruktur des lokalen Bookmarklets, keine serverseitige Nextcloud-App.

## Prinzipien

1. Kein externer JavaScript-Lader: `src/calendar-management-generic.js` enthält CSS, HTML und Programmlogik.
2. Die ausgelieferte JavaScript-Datei entsteht ausschließlich durch `python scripts/build.py`; Anwendungsänderungen werden in `src/parts/*.js` und `src/assets/*` vorgenommen. Die Installer-HTML wird separat aus der gepflegten `install/installer-template.html` erzeugt. Ein altes generiertes Installer-Artefakt dient niemals als Vorlage.
3. Vor Änderungen der Serverreihenfolge erfolgt eine schreibfreie CalDAV-Leseprüfung. Schreibvorgänge erfordern separate Benutzerbestätigung und anschließende Prüfung.
4. Kalenderidentitäten sind nur eindeutig bei nativer ID oder einzigartigem Namen innerhalb einer Herkunftsgruppe. Mehrdeutige Einträge werden nicht automatisch umgeschaltet.
5. Persönliche Einstellungen bleiben an Instanz und Benutzer gebunden. JSON-Schema 1 wird unverändert unterstützt.

## Source Map

| Datei | Verantwortungsbereich |
|---|---|
| `00-startup.js` | Version, Doppelstart-Schutz, Einstieg |
| `10-calendar-dom.js` | Kalender-DOM-Adapter und Kalender-Identität |
| `20-model-and-classification.js` | Filterregeln, Vorschläge, Schlüsselwörter, gespeicherte Profile und Hilfslogik |
| `30-ui-shell.js` | Isoliertes iFrame, Shadow-DOM und Einbettung der Assets |
| `40-ui-and-state.js` | Setup, Auswahl, Rendering, Profile und Sortierlisten |
| `50-caldav-and-interactions.js` | Kalenderumschaltung, CalDAV-Prüfung, Sortier- und Rücknahmeoperationen |
| `60-settings-serialization.js` | Sicherungsformat, Validierung, Import/Export |
| `70-editors-and-init.js` | Schnellansicht-Editor, Kategorien, Ereignisse, Initialisierung |
| `assets/calendar-management.css` | Darstellung und einheitliche Komponenten-Styles |
| `assets/calendar-management.html` | Dialogstruktur und Formularfelder |

Die Module werden durch den Build **in derselben lexikalischen IIFE** zusammengefügt. Sie haben daher keine separaten Imports/Exports und sind bewusst noch keine vollständig entkoppelten Packages. Es wird keine dynamische Netzwerkressource nachgeladen.

## Zustand, Datenquellen und Seiteneffekte

- **DOM-Adapter:** `collectCalendars()` liest sichtbare Nextcloud-Kalender neu aus. Reaktive Vue-Updates können DOM-Knoten ersetzen; vor jedem Klick wird die aktuelle Kalenderzeile ermittelt.
- **Klassifikation:** `classifyName()` liefert `{area,type,common}` aus einer gemeinsamen Cacheberechnung. Der Cache wird beim Ersetzen der Regeln und beim erneuten Einlesen der Kalender zurückgesetzt. Der Cache enthält keine DOM-Knoten.
- **Temporäre Schutzfreigabe:** `temporarilyReleasedKeys` existiert ausschließlich während des laufenden Bookmarklets. `alwaysVisibleKeys` bleibt im Browserspeicher erhalten.
- **Schreibende lokale Operationen:** `writeStorageBatch()` liest vorherige Werte, schreibt in definierter Reihenfolge und versucht eine Rücknahme bei Fehlern. LocalStorage bietet hier keine echte atomare Mehrschlüssel-Transaktion.
- **Rendern:** Normale Auswahländerungen verwenden `commitSelection()`, Sortieränderungen `commitSort()`. Beide sichern den Entwurf explizit, während `renderSort()` keine Speicheroperation mehr ausführt. Änderungen am Datenmodell verwenden bei Bedarf `renderAll()`.
- **CalDAV:** Lese- und Schreibprüfungen sind auf denselben Ursprung und das Kalenderverzeichnis des aktiven Benutzers beschränkt. Fehlende und ungültige Sortierwerte werden abgelehnt. Der Operation-Lock verhindert parallele UI-Interaktionen.

## Sicherheitsgrenzen

Die eigenständige JavaScript-Datei wird mit den Rechten der geöffneten Nextcloud-Seite ausgeführt. Sie muss deshalb wie jeder Browser-Code vor der Installation aus einer vertrauenswürdigen Quelle geprüft werden. Kalendernamen und IDs werden im lokalen Browserverlauf/Storage bzw. beim JSON-Export im Klartext abgelegt. Die Zuordnung von DOM-Kalender zu CalDAV-Kalender ist konservativ und kann bei Namensgleichheit oder unterschiedlichen Nextcloud-Versionen fehlschlagen; in diesem Fall werden keine ungeprüften Schreibvorgänge gestartet.

CalDAV ändert mehrere Kalender **nicht atomar**. Ein Fehler nach einem serverseitig wirksamen Request kann trotz Rücknahmeversuch einen unklaren Zustand hinterlassen. Der Benutzer muss im Fehlerfall die Sortierung direkt in Nextcloud kontrollieren; die lokale Sortiersicherung wird nicht automatisch gelöscht.

## Verifikation

- `node --check src/calendar-management-generic.js`
- `python tests/check_release.py`
- `python tests/test_saved_editor_201.py` (Chromium/Playwright)
- `python tests/test_caldav_safety_203.py` (Chromium/Playwright mit simulierten CalDAV-Antworten)

Die Installer-Vorlage enthält ausschließlich die Platzhalter `@@KP_BOOKMARKLET_HREF@@` und `@@KP_VERSION@@`. Der Build füllt diese aus derselben modularen JavaScript-Version; Copy/Paste und Drag-and-drop verwenden denselben URL-Wert ohne doppelte Speicherung des großen Skripts. Der Browser-Test `tests/test_installer_204.py` prüft beide Kopierwege, die Versionsanzeige und die mobile Breite.\n\nÄltere Release-QA-Berichte nennen teilweise Testdateien, die im aktuellen Repository nicht vorliegen. Diese historischen Angaben sind keine Nachweise über aktuell ausgeführte Tests.

Die vorhandenen Browser-Tests verwenden simulierte Nextcloud-Kalender. Ein Versionsmatrix-Test mit aktuellen produktiven Nextcloud- und CalDAV-Installationen bleibt eine separate Abnahmebedingung.

## Noch offene Verbesserungen

- Filtersemantik für Quellkategorien expliziter erklären; sie werden derzeit teils als Erweiterung statt als Schnittmenge verwendet.
- Platzhalter `*` sind flexible Teilstringmuster, nicht ausdrücklich am Namensanfang/-ende verankert. Vor einer Änderung ist die bestehende Konfiguration zu migrieren.
- Optionales portables JSON-Vorlagenformat ohne personenbezogene Kalender-IDs; die vorhandene persönliche Sicherung bleibt in Beta 15 bewusst unverändert.
- Vollständig isolierte Zustandsmodule erst nach zusätzlichen CalDAV-Kompatibilitätstests erwägen.
## 2.0.1: Gespeicherte Listen bearbeiten

Der Setup-Editor verwendet einen eigenen, nicht persistierten Bearbeitungsentwurf für feste und dynamische Profile sowie Sortier-Sets. Er teilt sich Kalenderidentitäten, Klassifikation und die lokale Speicherlogik mit den Hauptreitern. Änderungen werden erst bei „Änderungen speichern“ geschrieben; Serveroperationen werden nicht angestoßen.
