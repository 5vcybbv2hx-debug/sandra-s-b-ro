# Fahrtenbuch — iOS Shortcuts Anleitung

Diese Anleitung beschreibt, wie Sandra das Fahrtenbuch über iOS-Kurzbefehle (Shortcuts) automatisch erfasst. Die Shortcuts senden GPS-Koordinaten an die `recordDrive`-Backend-Function, die daraus Fahrt-Records erstellt.

## Funktionsweise

- **Start-Shortcut**: Beim Einsteigen ins Auto wird der Standort gesendet → es entsteht eine **offene Fahrt** (gelb markiert in der App).
- **End-Shortcut**: Beim Aussteigen wird erneut der Standort gesendet → die offene Fahrt wird **abgeschlossen** (Distanz per Haversine berechnet, Zielort per Reverse-Geocoding ermittelt).
- In der App kann Sandra dann mit einem Klick auf **„Vervollständigen"** Zweck und Projekt nachtragen.

---

## Voraussetzung: Endpoint & Token

Die `recordDrive`-Function ist über die App erreichbar. Den genauen Endpoint-URL findest du im Base44-Dashboard unter **Code → Functions → recordDrive**.

Authentifizierung erfolgt über einen Header:

| Header | Wert |
|---|---|
| `X-Drive-Token` | `sandra-drive-2026` |

Der Body ist JSON mit `action`, `lat` und `lon`.

---

## Shortcut 1: Fahrt starten

1. Öffne die **Kurzbefehle**-App auf dem iPhone.
2. Tippe auf **„Neuer Kurzbefehl"**.
3. Benenne ihn **„Fahrt starten"**.
4. Füge die Aktion **„Aktuellen Standort abrufen"** hinzu.
5. Füge die Aktion **„Dictionary"** (Wörterbuch) hinzu mit drei Feldern:
   - `action` — Text — `start`
   - `lat` — Zahl — `{{Aktueller Standort.Breitengrad}}` (Variable aus der Standort-Aktion)
   - `lon` — Zahl — `{{Aktueller Standort.Längengrad}}`
6. Füge die Aktion **„JSON aus Dictionary erstellen"** hinzu.
7. Füge die Aktion **„Inhalt von URL abrufen"** hinzu:
   - URL: `https://deine-app.base44.app/api/functions/recordDrive` *(echte Function-URL aus dem Dashboard verwenden)*
   - Methode: **POST**
   - Header: `X-Drive-Token` = `sandra-drive-2026`
   - Body: das erstellte JSON
8. **Fertig stellen** — teste den Shortcut einmal manuell.

> Tipp: Die Variable für den Standort fügst du ein, indem du im Dictionary-Feld das Tastatur-Symbol oben rechts tippst und **„Aktueller Standort"** → **„Breitengrad"** auswählst.

---

## Shortcut 2: Fahrt beenden

1. Neuer Kurzbefehl → benennen **„Fahrt beenden"**.
2. Aktion **„Aktuellen Standort abrufen"**.
3. Aktion **„Dictionary"** mit:
   - `action` — Text — `end`
   - `lat` — Zahl — `{{Aktueller Standort.Breitengrad}}`
   - `lon` — Zahl — `{{Aktueller Standort.Längengrad}}`
4. Aktion **„JSON aus Dictionary erstellen"**.
5. Aktion **„Inhalt von URL abrufen"**:
   - URL: gleiche `recordDrive`-URL
   - Methode: **POST**
   - Header: `X-Drive-Token` = `sandra-drive-2026`
   - Body: JSON
6. **Fertig stellen**.

---

## Automatisierung: Bluetooth-Verbindung

Damit die Shortcuts automatisch starten, wenn Sandra ins Auto steigt:

1. Öffne die **Kurzbefehle**-App → Reiter **„Automatisierung"**.
2. **„Persönliche Automatisierung erstellen"**.
3. Trigger: **„Bluetooth"** → **„Wird verbunden"**.
4. Gerät: das Auto-Bluetooth auswählen.
5. Aktion hinzufügen: **„Kurzbefehl ausführen"** → **„Fahrt starten"**.
6. **„Nicht nachfragen"** aktivieren → **Fertig**.

Zweite Automatisierung für das Beenden:

1. Trigger: **„Bluetooth"** → **„Wird getrennt"** (vom Auto).
2. Aktion: **„Kurzbefehl ausführen"** → **„Fahrt beenden"**.
3. **„Nicht nachfragen"** aktivieren → **Fertig**.

> Alternativ-Trigger falls Bluetooth nicht zuverlässig: **CarPlay** „Wird verbunden/getrennt".

---

## In der App

- **Offene Fahrten** erscheinen oben mit gelber Markierung und einem **„Vervollständigen"**-Button.
- Beim Vervollständigen trägst du **Zweck** und **Projekt** nach.
- **Abgeschlossene Fahrten** werden darunter nach Tag gruppiert angezeigt.
- CSV-Export pro Monat für Steuer / Buchhaltung.

## Fehlersuche

- **„Unauthorized"**: Token falsch oder fehlt — prüfe den Header `X-Drive-Token: sandra-drive-2026`.
- **„No open drive found"** beim Beenden: Es wurde vorher kein Start gesendet — die End-Shortcut erstellt dann trotzdem eine abgeschlossene Fahrt, aber ohne Startort/Distanz.
- **GPS ungenau**: Der Shortcut sollte nur ausgelöst werden, wenn der Standort präzise genug ist. Ggf. eine **„Warten"**-Aktion (2 Sekunden) vor dem Standortabruf einbauen, damit das GPS sich einschwingen kann.