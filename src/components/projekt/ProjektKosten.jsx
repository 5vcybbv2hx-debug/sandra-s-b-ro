import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { berechneProjektKosten } from '@/lib/projektKosten';

export default function ProjektKosten({ projekt, zeiten = [], fahrten = [], mitarbeiter = [], kmSatz }) {
  const k = berechneProjektKosten({ projekt, zeiten, fahrten, mitarbeiter, kmSatz });
  const effektiverSatz = k.kmAbrechenbar > 0 ? k.fahrtkosten / k.kmAbrechenbar : k.kmSatz;
  const satzLabel = `${effektiverSatz.toFixed(2).replace('.', ',')} €/km`;

  return (
    <div className="space-y-4">
      <Card className="p-5 shadow-sm">
        <div className="space-y-2">
          <div className="flex justify-between gap-3 py-2 border-b border-border">
            <span className="text-muted-foreground">Leistung ({k.stundenGesamt.toFixed(2)} h)</span>
            <span className="font-medium whitespace-nowrap">{formatCurrency(k.leistungGesamt)}</span>
          </div>
          <div className="flex justify-between gap-3 py-2 border-b border-border">
            <span className="text-muted-foreground">Fahrtkosten ({k.kmAbrechenbar.toFixed(1)} km × {satzLabel})</span>
            <span className="font-medium whitespace-nowrap">{formatCurrency(k.fahrtkosten)}</span>
          </div>
          <div className="flex justify-between gap-3 py-3 bg-cardbg rounded-xl px-4">
            <span className="font-semibold">Gesamtsumme</span>
            <span className="font-bold text-brand-dark text-lg whitespace-nowrap">{formatCurrency(k.gesamtkosten)}</span>
          </div>
          {k.istPauschal && (
            <div className="flex justify-between gap-3 py-2 px-4 rounded-xl border border-dashed border-border">
              <span className="text-muted-foreground">Pauschalbetrag (Alternative)</span>
              <span className="font-medium whitespace-nowrap">{formatCurrency(k.pauschalbetrag)}</span>
            </div>
          )}
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <h4 className="font-semibold mb-3">Abgerechnet / offen</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Zeiten abgerechnet</span>
            <span className="whitespace-nowrap">{k.stundenAbgerechnet.toFixed(2)} h · {formatCurrency(k.leistungAbgerechnet)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Zeiten offen (abrechenbar)</span>
            <span className="font-medium whitespace-nowrap">{k.stundenOffen.toFixed(2)} h · {formatCurrency(k.leistungOffen)}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Fahrten abrechenbar</span>
            <span className="whitespace-nowrap">{k.kmAbrechenbar.toFixed(1)} km · {formatCurrency(k.fahrtkosten)}</span>
          </div>
          {k.fahrtkostenNichtAbrechenbar > 0 && (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Fahrten nicht abrechenbar</span>
              <span className="text-muted-foreground whitespace-nowrap">{formatCurrency(k.fahrtkostenNichtAbrechenbar)}</span>
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}