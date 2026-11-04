# Qualitätssicherung – Kalenderprofile 2.0.2

## Fehlerursache

Im Release 2.0.1 wurde `el('saved-manager-discard')` aufgerufen, obwohl keine solche ID in der HTML-Oberfläche existierte. Das verursacht einen Laufzeitfehler und unterbricht die Initialisierung, bevor sämtliche Ereignisbehandlungen bereitstehen.

## Abnahmekriterien

1. `saved-manager-discard` existiert in der Setup-Fußzeile und verwirft Änderungen am lokalen Editorentwurf.
2. Sämtliche statischen `el('…')`-Referenzen existieren als eindeutige HTML-IDs.
3. JavaScript-Bundle, Bookmarklet-URL und Installationsseite sind reproduzierbar identisch.
4. Chromium startet den Editor, kann neue Profile anlegen, duplizieren, bearbeiten, sichern und schließen.
5. JSON-Schema und bestehende Speicherkennungen bleiben unverändert.
6. Ein Release darf erst nach erfolgreicher Startprüfung veröffentlicht werden.

Die GitHub-Actions-Protokolle dokumentieren die tatsächlichen Ergebnisse. Ein grüner Syntaxcheck allein gilt nicht als Laufzeittest.
