# Qualitätssicherung und Freigabe – Kalenderprofile 2.0.5

**Status:** Release-Kandidat, Veröffentlichung noch nicht bestätigt.  
**Abgrenzung:** Organisationsneutrale Text-/Beispielkorrekturen sowie ein neues, verbindliches Repository-Datenschutz-Gate. Keine Änderung von fachlichen Funktionen, CalDAV-Semantik, Datenformaten oder Speicherkennungen.

## Risikoanalyse

- Ein bisheriger projektbezogener Beispielwert war in Kommentaren und einem sichtbaren Platzhalter enthalten und wurde in generierte Bookmarklet- und Installer-Dateien übernommen. Künftig werden diese aus einer einzigen gepflegten Quelle regeneriert.
- Die Prüfung des aktuellen Repositorystandes sagt nichts Abschließendes über zuvor veröffentlichte unveränderliche Tags, heruntergeladene Assets oder externe Clones aus.
- Es sind keine realen Konfigurations- oder Kalenderexporte als Teil dieses Patches eingebunden; kontrolliert wird dies durch den neuen CI-Check.
- Bestehende Einstellungen, Exportformat und CalDAV-Abläufe sind unverändert.

## Verbindliche technische Prüfung

- [ ] Versionskonsistenz der Module, des Bundles, der Bookmarklet-URL und des Installers.
- [ ] Syntaxprüfung und Browser-Start-/Editor-Regressionsprüfung.
- [ ] Simulierte CalDAV-Sicherheits- und Rücknahme-Regressionen.
- [ ] Installer-Prüfung auf Desktop/Mobil und Kopierfunktion.
- [ ] Organisationsneutralität sämtlicher verfolgter Textdateien inklusive kodierter Installer-/URL-Artefakte.
- [ ] Unerwartete personenbezogene Konfigurations-Exports, Kalenderdateien und Geheimnismuster abgewiesen.
- [ ] Reproduzierbares Quellarchiv und SHA-256-Prüfsummen.
- [ ] PR-CI erfolgreich und nach Merge main-CI erfolgreich.
- [ ] Externe Freigabe ausdrücklich erteilt.
- [ ] Release-Tag und alle drei veröffentlichten Assets unverändert und erfolgreich verifiziert.

## Manuelle Grenzen

- Die Neutralitätsprüfung ist ein statischer, begriffsbasierten Check auf bekannte Muster; sie ersetzt keine allgemeine Datenschutz-Zertifizierung.
- Historische Artefakte und Referenzen bleiben vorhanden; für den Umgang damit gilt die [Historienrichtlinie](RELEASE_HISTORY_POLICY.md).
- Es wurde keine Live-CalDAV-Schreibprüfung aus diesem reinen Bereinigungsauftrag abgeleitet.

**Go/No-Go:** Zum Zeitpunkt der Erstellung noch nicht dokumentiert.
