# Zu Kalenderprofile beitragen

**Contributions welcome!** Kalenderprofile ist ein kostenloses Open-Source-Projekt unter der [MIT-Lizenz](LICENSE). Fehlerberichte, Verbesserungsvorschläge, Dokumentation, Übersetzungen, Forks und Pull Requests sind willkommen.

## Fehler und Ideen melden

Nutze die GitHub-Issues des Repositories. Für Fehler sind folgende Angaben hilfreich:

- Version von Kalenderprofile und Version der Nextcloud-Kalender-App
- Browser und Betriebssystem
- Schritte zur Reproduktion, erwartetes und tatsächliches Verhalten
- Wenn möglich: anonymisierte Fehlermeldung oder Screenshot

**Datenschutz:** Bitte keine privaten Kalendernamen, personenbezogenen Daten, Zugangsdaten, Cookies, Request-Tokens oder vollständigen JSON-Konfigurationssicherungen in Issues und Pull Requests hochladen.

## Änderungen einreichen

1. Repository forken und einen Branch mit aussagekräftigem Namen erstellen.
2. Fachliche Änderungen in `src/parts/*.js` vornehmen; Darstellung in `src/assets/*.css` bzw. `src/assets/*.html` anpassen.
3. Build und verfügbare Konsistenzprüfungen ausführen (Python 3 und Node.js erforderlich):

   ```bash
   python scripts/build.py
   python tests/check_release.py
   ```

4. Generierte Dateien `src/calendar-management-generic.js`, `install/bookmarklet-url.txt` und `install/installation.html` gemeinsam mit den Quellen einchecken.
5. Pull Request mit kurzer Beschreibung, Testhinweisen und ggf. Screenshots eröffnen.

Der GitHub-Actions-Workflow prüft den reproduzierbaren Build und die Konsistenz. Zusätzliche Tests gegen reale Nextcloud-Instanzen sollten möglichst nachvollziehbar dokumentiert werden.

## Kompatibilität

Bestehende Benutzerkonfigurationen und JSON-Sicherungen sollen erhalten bleiben. Bitte technische Speicherkennungen, Exportformate und die CalDAV-Schreiblogik nicht ohne Migrations- bzw. Sicherheitskonzept verändern.

Mit dem Einreichen eines Beitrags erklärst du, dass du berechtigt bist, den beigesteuerten Code unter der MIT-Lizenz dieses Projekts zur Verfügung zu stellen.
