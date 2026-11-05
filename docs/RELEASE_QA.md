# Qualitäts- und Release-Prüfung – Kalenderprofile 2.0.0

**Release-Datum:** 04.11.2026  
**Basis:** V2.0.0-beta.15, vom Anwender in der produktiven Nextcloud getestet und freigegeben.  
**Umfang:** Abschließende technische Prüfung und minimaler Release-Feinschliff; keine neuen Bedienfunktionen.

## Ergebnis

**Historischer Abnahmevermerk: 17 von 17 Prüfungen als bestanden dokumentiert.** Die ursprünglich genannte Einzelprotokolldatei und das damalige Teststartskript sind im aktuellen Repository nicht vorhanden; dieser historische Vermerk ersetzt keinen neu ausgeführten Test. Bei damaligen Tests kamen nach der Dokumentation Chromium und simulierte Kalender zum Einsatz.

| Prüfbereich | Ergebnis |
|---|---|
| Build & JavaScript-Syntax | Bestanden: Node.js-Syntaxprüfung, 8 Entwicklungsabschnitte, HTML/CSS-Einbettung |
| Installer & Bookmarklet | Bestanden: URL-Dekodierung reproduziert den vollständigen JavaScript-Quelltext bytegenau |
| Oberfläche | Bestanden: sichtbarer Untertitel ohne „(Generic)“, funktionierende Setup-Unterreiter, UI-Smoketest |
| Ältere Konfigurationsdateien und Einstellungen | Historisch dokumentiert: Import, Alias-Kürzel, Schnellansichten, Beta-7-Migration |
| Bereiche & Arten | Bestanden: Vorschlagserkennung, Schlüsselwortmuster, Ausschlüsse, Neuanlage, Kennungsänderung |
| Einzelauswahl | Bestanden: Suche, Mehrfachfilter, Sammelauswahl, temporär lösbare Fixierungen |
| Profile & Sortier-Sets | Bestanden: Anlegen, Umbenennen, Sortieren, Löschen, Persistenz |
| Lokale Speicherung | Bestanden: Mehrschlüssel-Rücknahmeversuch, bevorzugter Bereich, Reopening |
| CalDAV-Sicherungen | Bestanden (Simulation): ungültige Sortierwerte, Schreibstatusprüfung, Zielpfadkontrolle |
| Packaging | Bestanden: erwartete Paketdateien, ZIP-CRC-Prüfung und SHA-256-Kontrollen |

## Änderungen gegenüber Beta 15

1. **Produktbezeichnung:** In der Oberfläche und auf der Installationsseite lautet der Produktname **Kalenderprofile**. Der Untertitel lautet `Kalenderverwaltung für Nextcloud · V2.0.0`.
2. **Persistenzkorrektur:** Der bevorzugte Bereich wird bei mehrteiligen Speicheroperationen als Rohtext abgelegt, genau wie bei einer manuellen Änderung. Ältere, versehentlich JSON-kodierte Kennungen werden weiterhin als String gelesen. Die Änderung benötigt keine Migration und verändert keine anderen Einstellungen.
3. **Qualitätssicherung:** Ein neuer Regressionstest für ältere bevorzugte Bereiche; bestehende Tests warten bei JSON-Importen auf den tatsächlichen Abschluss, statt auf ein zufällig frühes UI-Ereignis.
4. **Releasepflege:** Versionskennung 2.0.0, konsolidiertes Änderungsprotokoll, aktualisierte Installation und Dokumentation.

## Kompatibilität und Grenzen

- Unverändert: Browser-Speicher-Namespace `nc-calendar-management-generic-v2`, JSON-Exportformat `nextcloud-calendar-management-generic` und `schemaVersion: 1`. Die Wörter „generic“ in diesen **technischen IDs** bleiben absichtlich bestehen, damit Beta-15-Einstellungen weiter funktionieren.
- Ein erneuter JSON-Import ist beim Wechsel von Beta 15 auf 2.0.0 **nicht** erforderlich.
- Die automatisierten Prüfungen verwenden eine simulierte Nextcloud-Kalenderoberfläche und simulierte CalDAV-Antworten. Sie ersetzen keine Live-Kompatibilitätsmatrix für verschiedene Nextcloud-Kalenderversionen.
- CalDAV-Sortierung über mehrere Kalender ist serverseitig keine atomare Transaktion. Bei Teilfehlern wird eine Rücknahme versucht; ein unklarer Serverzustand kann nicht vollständig ausgeschlossen werden.
- Das Bookmarklet wird in der geöffneten Nextcloud-Sitzung ausgeführt. Es darf nur aus vertrauenswürdigen Quellen installiert werden. Konfigurationen und Kalenderbezeichnungen werden lokal bzw. im JSON-Export im Klartext gespeichert.

**Freigabestatus:** Die Software ist als 2.0.0-Release paketiert und im GitHub-Repository bereitgestellt. Durch die Release-Prüfung wurden keine produktiven Nextcloud-Serveränderungen vorgenommen.