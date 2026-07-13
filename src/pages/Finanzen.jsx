import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, monthLabel } from '@/lib/format';
import { getDefaultSteuerProzent } from '@/lib/settings';
import { toast } from 'sonner';

export default function Finanzen() {
  const [monat, setMonat] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [finanz, setFinanz] = useState(null);
  const [zeiteintraege, setZeiteintraege] = useState([]);
  const [allFinanzen, setAllFinanzen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);

  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(new Date().getFullYear(), i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });

  useEffect(() => { loadFinanz(monat); }, [monat]);

  const loadFinanz = async (m) => {
    setLoading(true);
    try {
      let records = await base44.entities.Finanzen_Monat.filter({ monat: m });
      let f;
      if (records.length === 0) f = await base44.entities.Finanzen_Monat.create({ monat: m, stunden_ziel: 0, stundensatz_durchschnitt: 0, einnahmen_ist: 0, ausgaben_ist: 0, steuerruecklage_prozent: getDefaultSteuerProzent() });
      else f = records[0];
      setFinanz(f);
      const [allZeit, allF, p] = await Promise.all([base44.entities.Zeiteintrag.list('-datum', 500), base44.entities.Finanzen_Monat.list('-monat', 100), base44.entities.Projekt.list('-updated_date', 200)]);
      setZeiteintraege(allZeit.filter((z) => z.datum?.startsWith(m)));
      const year = m.split('-')[0];
      setAllFinanzen(allF.filter((x) => x.monat?.startsWith(year)));
      setProjekte(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const updateField = async (field, value) => { if (!finanz) return; const numValue = Number(value) || 0; setFinanz({ ...finanz, [field]: numValue }); try { await base44.entities.Finanzen_Monat.update(finanz.id, { [field]: numValue }); } catch (e) { console.error(e); } };

  if (loading || !finanz) return <div className="p-8 text-center text-muted-foreground">Lade Finanzen...</div>;

  const geleisteteStunden = zeiteintraege.reduce((sum, z) => sum + (z.stunden || 0), 0);
  const zielumsatz = (finanz.stunden_ziel || 0) * (finanz.stundensatz_durchschnitt || 0);
  const gewinn = (finanz.einnahmen_ist || 0) - (finanz.ausgaben_ist || 0);
  const steuerruecklage = gewinn * (finanz.steuerruecklage_prozent || 0) / 100;
  const verfuegbar = gewinn - steuerruecklage;
  const progress = finanz.stunden_ziel > 0 ? Math.min(100, (geleisteteStunden / finanz.stunden_ziel) * 100) : 0;
  const onCourse = geleisteteStunden * (finanz.stundensatz_durchschnitt || 0);

  const stundenMap = {};
  zeiteintraege.forEach((z) => { stundenMap[z.projekt_id] = (stundenMap[z.projekt_id] || 0) + (z.stunden || 0); });
  const projectRevenue = projekte.map((p) => {
    const stunden = stundenMap[p.id] || 0;
    const betrag = p.abrechnungsart === 'Pauschal' ? (p.ist_abgerechnet ? p.pauschalbetrag : 0) : stunden * (p.stundensatz || 0);
    return { ...p, stunden, betrag };
  }).filter((p) => p.stunden > 0 || p.betrag > 0);
  const totalRevenue = projectRevenue.reduce((s, p) => s + (p.betrag || 0), 0);

  const year = monat.split('-')[0];
  const yearMonths = Array.from({ length: 12 }, (_, i) => `${year}-${String(i + 1).padStart(2, '0')}`);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Finanzen</h1>
        <Select value={monat} onValueChange={setMonat}><SelectTrigger className="w-56 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent></Select>
      </div>
      <p className="text-lg font-semibold capitalize">{monthLabel(monat)}</p>

      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Stunden</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Geleistet</span><span className="font-medium">{geleisteteStunden.toFixed(1)} h</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Ziel</span><span className="font-medium">{finanz.stunden_ziel} h</span></div>
            <Progress value={progress} className="h-3" />
            <p className="text-sm text-muted-foreground">Auf Kurs für: <span className="font-medium text-foreground">{formatCurrency(onCourse)}</span></p>
          </div>
        </Card>
        <Card className="p-5 shadow-sm">
          <h3 className="font-semibold mb-4">Einnahmen & Ausgaben</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Zielumsatz</span><span className="font-medium">{formatCurrency(zielumsatz)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Gewinn</span><span className="font-bold text-brand-dark">{formatCurrency(gewinn)}</span></div>
            <div className="flex justify-between text-sm"><span className="text-muted-foreground">Steuerrücklage ({finanz.steuerruecklage_prozent}%)</span><span className="text-destructive">{formatCurrency(steuerruecklage)}</span></div>
            <div className="flex justify-between p-3 bg-cardbg rounded-xl"><span className="font-semibold">Verfügbar nach Steuer</span><span className="font-bold text-brand-dark">{formatCurrency(verfuegbar)}</span></div>
          </div>
        </Card>
      </div>

      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Bearbeiten</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><Label>Stunden-Ziel</Label><Input type="number" value={finanz.stunden_ziel} onChange={(e) => setFinanz({ ...finanz, stunden_ziel: e.target.value })} onBlur={(e) => updateField('stunden_ziel', e.target.value)} className="min-h-[48px]" /></div>
          <div><Label>Ø Stundensatz (€)</Label><Input type="number" value={finanz.stundensatz_durchschnitt} onChange={(e) => setFinanz({ ...finanz, stundensatz_durchschnitt: e.target.value })} onBlur={(e) => updateField('stundensatz_durchschnitt', e.target.value)} className="min-h-[48px]" /></div>
          <div><Label>Steuerrücklage (%)</Label><Input type="number" value={finanz.steuerruecklage_prozent} onChange={(e) => setFinanz({ ...finanz, steuerruecklage_prozent: e.target.value })} onBlur={(e) => updateField('steuerruecklage_prozent', e.target.value)} className="min-h-[48px]" /></div>
          <div><Label>Einnahmen IST (€)</Label><Input type="number" value={finanz.einnahmen_ist} onChange={(e) => setFinanz({ ...finanz, einnahmen_ist: e.target.value })} onBlur={(e) => updateField('einnahmen_ist', e.target.value)} className="min-h-[48px]" /></div>
          <div><Label>Ausgaben IST (€)</Label><Input type="number" value={finanz.ausgaben_ist} onChange={(e) => setFinanz({ ...finanz, ausgaben_ist: e.target.value })} onBlur={(e) => updateField('ausgaben_ist', e.target.value)} className="min-h-[48px]" /></div>
        </div>
        <div className="mt-4"><Label>Notizen</Label><Textarea value={finanz.notizen || ''} onChange={(e) => setFinanz({ ...finanz, notizen: e.target.value })} rows={2} onBlur={(e) => base44.entities.Finanzen_Monat.update(finanz.id, { notizen: e.target.value }).then(() => toast.success('Gespeichert'))} /></div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Projektumsätze — {monthLabel(monat)}</h3><span className="text-lg font-bold text-brand-dark">{formatCurrency(totalRevenue)}</span></div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">Projekt</th><th className="py-2 pr-4 font-medium text-right">Stunden</th><th className="py-2 pr-4 font-medium text-right">Satz</th><th className="py-2 pr-4 font-medium text-right">Umsatz</th><th className="py-2 font-medium text-center">Abgerechnet</th></tr></thead>
            <tbody>
              {projectRevenue.map((p) => (<tr key={p.id} className="border-b border-border/50"><td className="py-2 pr-4 truncate max-w-[200px]">{p.projekt_name}</td><td className="py-2 pr-4 text-right">{p.stunden.toFixed(1)} h</td><td className="py-2 pr-4 text-right">{p.abrechnungsart === 'Pauschal' ? 'Pauschal' : formatCurrency(p.stundensatz)}</td><td className="py-2 pr-4 text-right font-medium">{formatCurrency(p.betrag)}</td><td className="py-2 text-center">{p.ist_abgerechnet ? '✓' : '—'}</td></tr>))}
              {projectRevenue.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Keine Umsätze in diesem Monat.</td></tr>}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Jahresübersicht {year}</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">Monat</th><th className="py-2 pr-4 font-medium text-right">Einnahmen</th><th className="py-2 pr-4 font-medium text-right">Ausgaben</th><th className="py-2 pr-4 font-medium text-right">Gewinn</th><th className="py-2 font-medium text-right">Steuer</th></tr></thead>
            <tbody>
              {yearMonths.map((m) => { const f = allFinanzen.find((x) => x.monat === m); const g = f ? (f.einnahmen_ist || 0) - (f.ausgaben_ist || 0) : 0; const st = f ? g * (f.steuerruecklage_prozent || 0) / 100 : 0; return (<tr key={m} className="border-b border-border/50"><td className="py-2 pr-4 capitalize">{monthLabel(m)}</td><td className="py-2 pr-4 text-right">{f ? formatCurrency(f.einnahmen_ist) : '—'}</td><td className="py-2 pr-4 text-right">{f ? formatCurrency(f.ausgaben_ist) : '—'}</td><td className="py-2 pr-4 text-right font-medium">{f ? formatCurrency(g) : '—'}</td><td className="py-2 text-right text-destructive">{f ? formatCurrency(st) : '—'}</td></tr>); })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}