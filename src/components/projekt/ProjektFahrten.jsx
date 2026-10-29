import { formatCurrency, formatDate } from '@/lib/format';
import { fahrtKosten } from '@/lib/projektKosten';

export default function ProjektFahrten({ fahrten = [], mitarbeiter = [], kmSatz = 0.3 }) {
  const personName = (id) => mitarbeiter.find((m) => m.id === id)?.name || '—';
  const kmGesamt = fahrten.reduce((s, f) => s + (Number(f.kilometer) || 0), 0);
  const kostenGesamt = fahrten
    .filter((f) => f.abrechenbar !== false)
    .reduce((s, f) => s + fahrtKosten(f, kmSatz), 0);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Kilometer gesamt</p>
          <p className="text-2xl font-bold text-brand-dark">{kmGesamt.toFixed(1)} km</p>
        </div>
        <div className="bg-cardbg rounded-2xl p-4">
          <p className="text-sm text-muted-foreground">Fahrtkosten</p>
          <p className="text-2xl font-bold text-brand-dark">{formatCurrency(kostenGesamt)}</p>
        </div>
      </div>

      {fahrten.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Fahrten erfasst.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Datum</th>
                <th className="py-2 pr-3 font-medium whitespace-nowrap">Person</th>
                <th className="py-2 pr-3 font-medium">Startort</th>
                <th className="py-2 pr-3 font-medium">Zielort</th>
                <th className="py-2 pr-3 font-medium">Zweck</th>
                <th className="py-2 font-medium text-right whitespace-nowrap">km</th>
              </tr>
            </thead>
            <tbody>
              {fahrten.map((f) => (
                <tr key={f.id} className="border-b border-border/40">
                  <td className="py-2 pr-3 whitespace-nowrap text-muted-foreground">{formatDate(f.datum)}</td>
                  <td className="py-2 pr-3 whitespace-nowrap">{personName(f.mitarbeiter_id)}</td>
                  <td className="py-2 pr-3">{f.startort || '—'}</td>
                  <td className="py-2 pr-3">{f.zielort || '—'}</td>
                  <td className="py-2 pr-3 text-muted-foreground">{f.zweck || '—'}</td>
                  <td className="py-2 text-right font-medium whitespace-nowrap">
                    {(Number(f.kilometer) || 0).toFixed(1)}
                    {f.abrechenbar === false && (
                      <span className="ml-1 text-[10px] uppercase text-amber-600">n. a.</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}