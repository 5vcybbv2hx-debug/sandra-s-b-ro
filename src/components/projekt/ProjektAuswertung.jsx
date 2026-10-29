import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/lib/format';
import { berechneProjektKosten } from '@/lib/projektKosten';

const inZeitraum = (datum, zeitraum) => {
  if (zeitraum === 'gesamt') return true;
  if (!datum) return false;
  const now = new Date();
  const jahr = now.getFullYear();
  if (zeitraum === 'monat') {
    return datum.startsWith(`${jahr}-${String(now.getMonth() + 1).padStart(2, '0')}`);
  }
  const startMonat = Math.floor(now.getMonth() / 3) * 3 + 1;
  const endMonat = startMonat + 2;
  const start = `${jahr}-${String(startMonat).padStart(2, '0')}-01`;
  const end = `${jahr}-${String(endMonat).padStart(2, '0')}-31`;
  return datum >= start && datum <= end;
};

export default function ProjektAuswertung({ projekte = [], zeiten = [], fahrten = [], mitarbeiter = [], zeitraum = 'gesamt' }) {
  const rows = useMemo(
    () =>
      projekte.map((p) => {
        const z = zeiten.filter((e) => e.projekt_id === p.id && inZeitraum(e.datum, zeitraum));
        const f = fahrten.filter((e) => e.projekt_id === p.id && inZeitraum(e.datum, zeitraum));
        const k = berechneProjektKosten({ projekt: p, zeiten: z, fahrten: f, mitarbeiter, kmSatz: undefined });
        return { id: p.id, name: p.projekt_name || '—', ...k };
      }),
    [projekte, zeiten, fahrten, mitarbeiter, zeitraum]
  );

  const summe = rows.reduce(
    (acc, r) => ({
      stunden: acc.stunden + r.stundenGesamt,
      km: acc.km + r.kmGesamt,
      fahrtkosten: acc.fahrtkosten + r.fahrtkosten,
      leistung: acc.leistung + r.leistungGesamt,
      gesamt: acc.gesamt + r.gesamtkosten,
    }),
    { stunden: 0, km: 0, fahrtkosten: 0, leistung: 0, gesamt: 0 }
  );

  if (rows.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">Keine Projekte in dieser Auswahl.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
            <th className="py-2 pr-3 font-medium">Projekt</th>
            <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Stunden</th>
            <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">km</th>
            <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Fahrtkosten</th>
            <th className="py-2 pr-3 font-medium text-right whitespace-nowrap">Leistung</th>
            <th className="py-2 font-medium text-right whitespace-nowrap">Gesamt</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/40">
              <td className="py-2 pr-3 truncate max-w-[220px]">
                <Link to={`/projekte/${r.id}`} className="hover:text-brand hover:underline">{r.name}</Link>
              </td>
              <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{r.stundenGesamt.toFixed(1)}</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{r.kmGesamt.toFixed(1)}</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(r.fahrtkosten)}</td>
              <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(r.leistungGesamt)}</td>
              <td className="py-2 text-right font-medium whitespace-nowrap tabular-nums">{formatCurrency(r.gesamtkosten)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-border font-semibold">
            <td className="py-2 pr-3">Summe ({rows.length} Projekte)</td>
            <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{summe.stunden.toFixed(1)}</td>
            <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{summe.km.toFixed(1)}</td>
            <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(summe.fahrtkosten)}</td>
            <td className="py-2 pr-3 text-right whitespace-nowrap tabular-nums">{formatCurrency(summe.leistung)}</td>
            <td className="py-2 text-right text-brand-dark whitespace-nowrap tabular-nums">{formatCurrency(summe.gesamt)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  );
}