# Qualitätssicherung und Freigabe – Kalenderprofile 2.0.5

**Status:** Am 06.11.2026 als GitHub-Release v2.0.5 veröffentlicht. Alle verpflichtenden automatisierten Qualitäts- und Release-Gates bestanden. Kein Nachweis zusätzlicher Live-CalDAV-Schreibtests.  
**Abgrenzung:** Organisationsneutrale Text-/Beispielkorrekturen sowie ein neues, verbindliches Repository-Datenschutz-Gate. Keine Änderung von fachlichen Funktionen, CalDAV-Semantik, Datenformaten oder Speicherkennungen.

## Risikoanalyse

- Ein bisheriger projektbezogener Beispielwert war in Kommentaren und einem sichtbaren Platzhalter enthalten und wurde in generierte Bookmarklet- und Installer-Dateien übernommen. Künftig werden diese aus einer einzigen gepflegten Quelle regeneriert.
- Die Prüfung des aktuellen Repositorystandes sagt nichts Abschließendes über zuvor veröffentlichte unveränderliche Tags, heruntergeladene Assets oder externe Clones aus.
- Es sind keine realen Konfigurations- oder Kalenderexporte als Teil dieses Patches eingebunden; kontrolliert wird dies durch den neuen CI-Check.
- Bestehende Einstellungen, Exportformat und CalDAV-Abläufe sind unverändert.

## Verbindliche technische Prüfung

- [x] Versionskonsistenz der Module, des Bundles, der Bookmarklet-URL und des Installers.
- [x] Syntaxprüfung und Browser-Start-/Editor-Regressionsprüfung.
- [x] Simulierte CalDAV-Sicherheits- und Rücknahme-Regressionen.
- [x] Installer-Prüfung auf Desktop/Mobil und Kopierfunktion.
- [x] Organisationsneutralität sämtlicher verfolgter Textdateien inklusive kodierter Installer-/URL-Artefakte.
- [x] Unerwartete personenbezogene Konfigurations-Exports, Kalenderdateien und Geheimnismuster abgewiesen.
- [x] Reproduzierbares Quellarchiv und SHA-256-Prüfsummen.
- [x] PR-CI erfolgreich und nach Merge main-CI erfolgreich.
- [x] Externe Freigabe ausdrücklich erteilt.
- [x] Release-Tag und alle drei veröffentlichten Assets unverändert und erfolgreich verifiziert.

## Manuelle Grenzen

- Die Neutralitätsprüfung ist ein statischer, begriffsbasierten Check auf bekannte Muster; sie ersetzt keine allgemeine Datenschutz-Zertifizierung.
- Historische Artefakte und Referenzen bleiben vorhanden; für den Umgang damit gilt die [Historienrichtlinie](RELEASE_HISTORY_POLICY.md).
- Es wurde keine Live-CalDAV-Schreibprüfung aus diesem reinen Bereinigungsauftrag abgeleitet.

**Go/No-Go:** **GO, abgeschlossen.** Die Veröffentlichung erfolgte nach ausdrücklicher Freigabe und vollständig erfolgreicher Release-Pipeline. Die historischen und forensischen Grenzen bleiben bestehen.

## Verifizierte Veröffentlichung

- Repository-Sichtbarkeit: **öffentlich** (beabsichtigter Betriebsmodus).
- [Pull Request #18](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/pull/18) – integriert; fachliche Freigabe in `docs/releases/v2.0.5.approved`.
- [PR-CI #42130463211](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42130463211) – erfolgreich (inkl. Neutralitätsgate, Build, Installer und CalDAV-Regression).
- [Main-CI #42130707583](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42130707583) – erfolgreich.
- [Release-CI #42130707485](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/actions/runs/42130707485) – erfolgreich mit SHA-256-Prüfung der veröffentlichten Dateien.
- [GitHub-Release v2.0.5](https://github.com/matt-ek/kalenderprofile-nc-calendar-management/releases/tag/v2.0.5): veröffentlicht am 2026-11-05 um 23:37:29 UTC (06.11.2026, 00:37:29 MEZ).
- Git-Tag `v2.0.5` auf Commit `7781d1b3a6b7c15ae616aaf47c9ec1ef63122ba0`.
- Assetdateien: `kalenderprofile-v2.0.5-installation.html` (330204 Bytes), `kalenderprofile-v2.0.5.zip` (321188 Bytes), `SHA256SUMS.txt` (200 Bytes).
- Frühere Tags/Downloads bleiben unverändert und unterliegen der [Historienrichtlinie](RELEASE_HISTORY_POLICY.md).
