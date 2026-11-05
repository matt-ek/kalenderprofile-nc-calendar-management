## Anlass und verknüpftes Issue

Closes #<!-- Nummer ergänzen -->

## Änderung und bewusste Nicht-Änderungen

- Zweck und Umfang:
- Unverändert (Funktionen, UI/UX, Speicherformat, CalDAV-Semantik):
- Auswirkungen auf Nutzende / Installation:

## Risikobewertung

- [ ] Keine Änderung an JSON-Schema, Storage-IDs oder Bestandskonfigurationen
- [ ] Keine Änderung an CalDAV-/Server-Schreibvorgängen
- [ ] Keine Änderung am sichtbaren UI/UX-Verhalten
- [ ] Security-/Datenschutzfolgen geprüft
- [ ] Abweichungen von obigen Punkten sind im PR begründet und separat freigegeben

## Nachweisbare Tests

Bitte nur tatsächlich durchgeführte Prüfungen ankreuzen:

- [ ] Build: python scripts/build.py
- [ ] Konsistenz: python tests/check_release.py
- [ ] Browserstart / Editor: python tests/test_saved_editor_201.py
- [ ] Git-Diff für generierte Dateien ist leer
- [ ] Relevante Regressionstests für die Änderung
- [ ] Manuelle Nextcloud-/Browserprüfung (Versionen und Dummy-Daten nennen)
- [ ] CalDAV-Negativ- und Recovery-Tests, falls betroffen
- [ ] Migration / Import / Export, falls betroffen

**Testergebnisse / CI-Links:**

## Freigabe

- [ ] Alle Akzeptanzkriterien erfüllt
- [ ] Bekannte Risiken, offene Findings und Rückfallstrategie dokumentiert
- [ ] Dokumentation / Release Notes bei Bedarf ergänzt
- [ ] Keine Geheimnisse oder personenbezogenen Testdaten eingecheckt

**Release-Zuordnung:** noch offen / vX.Y.Z

Siehe docs/PROJECT_PLAN.md und docs/RELEASE_PROCESS.md.
