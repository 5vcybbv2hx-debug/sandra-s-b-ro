import { getKmSatz } from '@/lib/settings';

export const DEFAULT_KM_SATZ = 0.3;

// Projekt-Stundensatz hat Vorrang, sonst Stundensatz der Person
export function resolveStundensatz(projekt, person) {
  const projektSatz = Number(projekt?.stundensatz) || 0;
  if (projektSatz > 0) return projektSatz;
  return Number(person?.stundensatz) || 0;
}

// Km-Satz der Fahrt überschreibt den Standard
export function fahrtKosten(fahrt, standardSatz = DEFAULT_KM_SATZ) {
  const satz = Number(fahrt?.km_satz) > 0 ? Number(fahrt.km_satz) : standardSatz;
  return (Number(fahrt?.kilometer) || 0) * satz;
}

export function berechneProjektKosten({ projekt, zeiten = [], fahrten = [], mitarbeiter = [], kmSatz }) {
  const standardSatz = Number(kmSatz) > 0 ? Number(kmSatz) : getKmSatz();
  const personen = new Map(mitarbeiter.map((m) => [m.id, m]));
  const k = {
    kmSatz: standardSatz,
    stundenGesamt: 0,
    stundenAbgerechnet: 0,
    stundenOffen: 0,
    leistungGesamt: 0,
    leistungAbgerechnet: 0,
    leistungOffen: 0,
    kmGesamt: 0,
    kmAbrechenbar: 0,
    fahrtkosten: 0,
    fahrtkostenNichtAbrechenbar: 0,
    gesamtkosten: 0,
    istPauschal: projekt?.abrechnungsart === 'Pauschal',
    pauschalbetrag: Number(projekt?.pauschalbetrag) || 0,
  };

  zeiten
    .filter((z) => !z.timer_laeuft)
    .forEach((z) => {
      const stunden = Number(z.stunden) || 0;
      const betrag = stunden * resolveStundensatz(projekt, personen.get(z.mitarbeiter_id));
      k.stundenGesamt += stunden;
      k.leistungGesamt += betrag;
      if (z.ist_abgerechnet) {
        k.stundenAbgerechnet += stunden;
        k.leistungAbgerechnet += betrag;
      }
    });

  fahrten.forEach((f) => {
    const km = Number(f.kilometer) || 0;
    k.kmGesamt += km;
    const kosten = fahrtKosten(f, standardSatz);
    if (f.abrechenbar === false) {
      k.fahrtkostenNichtAbrechenbar += kosten;
    } else {
      k.kmAbrechenbar += km;
      k.fahrtkosten += kosten;
    }
  });

  k.stundenOffen = k.stundenGesamt - k.stundenAbgerechnet;
  k.leistungOffen = k.leistungGesamt - k.leistungAbgerechnet;
  k.gesamtkosten = k.leistungGesamt + k.fahrtkosten;

  return k;
}