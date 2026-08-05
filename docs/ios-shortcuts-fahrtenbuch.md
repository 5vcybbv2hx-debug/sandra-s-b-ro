# Fahrtenbuch mit iPhone Kurzbefehlen — Anleitung für Sandra

## Was du brauchst

- iPhone mit iOS 16 oder höher
- Kurzbefehle App (vorinstalliert)
- Sandra's Büro App URL (wird nach Deploy bekannt gegeben)

## Schritt 1: "Fahrt starten" Kurzbefehl erstellen

1. Öffne die **Kurzbefehle** App
2. Tippe **+** (oben rechts) für neuen Kurzbefehl
3. Nenne ihn **"Fahrt starten"**
4. Tippe **+ Aktion hinzufügen**
5. Suche **"Standort abrufen"** → hinzufügen
6. Suche **"Text"** → hinzufügen. Füge ein:
   ```
   {"action":"start","lat":[Standort]Breitengrad,"lng":[Standort]Längengrad}
   ```
   (Die Werte in Klammern [ ] als Variablen aus der Standort-Aktion einfügen)
7. Suche **"Inhalt von URL abrufen"** → hinzufügen
   - URL: `https://app.base44.com/api/apps/APP_ID/functions/recordDrive`
   - Methode: **POST**
   - Header: `X-Drive-Token` = `sandra-drive-2026`
   - Body: **Datei** → den Text von oben
8. Füge **"Ergebnis anzeigen"** oder **"Benachrichtigung anzeigen"** hinzu
9. Füge **"In Zwischenablage kopieren"** mit dem drive_id aus dem Ergebnis hinzu

## Schritt 2: "Fahrt beenden" Kurzbefehl erstellen

1. Neuer Kurzbefehl → **"Fahrt beenden"**
2. **Standort abrufen** Aktion hinzufügen
3. **Text"** Aktion:
   ```
   {"action":"end","lat":[Standort]Breitengrad,"lng":[Standort]Längengrad,"drive_id":[Zwischenablage]}
   ```
4. **Inhalt von URL abrufen**:
   - Gleiche URL, Methode POST, gleicher Header
   - Body: den Text
5. **Benachrichtigung anzeigen** mit Kilometern aus dem Ergebnis

## Schritt 3: Automatisierung einrichten (optional, ohne Tippen)

1. Öffne **Automatisierung** in der Kurzbefehle App
2. **+ Neue Automatisierung erstellen**
3. Trigger: **"Bluetooth verbindet mit"** → dein Auto auswählen
4. Aktion: **Kurzbefehl ausführen** → "Fahrt starten"
5. **Vor dem Ausführen fragen**: EIN (du bestätigst mit einem Tap)

Zweite Automatisierung:
1. Trigger: **"Bluetooth trennt von"** → dein Auto
2. Aktion: **Kurzbefehl ausführen** → "Fahrt beenden"
3. **Vor dem Ausführen fragen**: AUS (läuft automatisch)

## So funktioniert es im Alltag

**Einsteigen ins Auto:**
- iPhone verbindet sich mit Auto-Bluetooth
- Notification: "Fahrt starten?" → **Ja** tippen
- GPS wird erfasst, Fahrt wird erstellt

**Aussteigen:**
- Bluetooth trennt → "Fahrt beenden" läuft automatisch
- GPS wird erfasst, Distanz wird berechnet
- Benachrichtigung: "12.5 km erfasst"

**Später in der App:**
- Fahrtenliste öffnen → "Offene Fahrten" oben
- Zweck eingeben (z.B. "Baustellenbesuch")
- Projekt auswählen → Vervollständigen

## Wichtige Hinweise

- GPS in Tiefgaragen kann ungenau sein
- Wenn du vergessen hast zu starten → Fahrt manuell hinzufügen
- Die Distanz ist Luftlinie × 1.3 (Straßen-Korrekturfaktor) — bei Bedarf in der App korrigieren
- Der Token "sandra-drive-2026" kann später geändert werden

## Token ändern (Sicherheit)

Falls der Token geändert werden muss, in der Backend-Function `recordDrive` den Wert anpassen und in den Kurzbefehlen den neuen Header eintragen.
