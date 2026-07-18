import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Save, TrendingUp, BarChart3, AlertTriangle } from 'lucide-react';
import { formatCurrency, currentMonth } from '@/lib/format';
import { getDefaultStundensatz, getDefaultSteuerProzent, saveSettings } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function KapazitaetPlanung() {
  const [config, setConfig] = useState(null);
  const [weeklyHours, setWeeklyHours] = useState(25);
  const [stundensatz, setStundensatz] = useState(getDefaultStundensatz());
  const [urlaub, setUrlaub] = useState(4);
  const [steuerPct, setSteuerPct] = useState(getDefaultSteuerProzent());
  const [bookedHours, setBookedHours] = useState(0);
  const [upcoming, setUpcoming] = useState(0);
  const [erfahrungswerte, setErfahrungswerte] = useState([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => {
    try {
      const [kap, zeiten, phasen, erf] = await Promise.all([
        base44.entities.Kapazitaetseinstellung.list(),
        base44.entities.Zeiteintrag.list('-datum', 500),
        base44.entities.Projektphase.list('-updated_date', 500),
        base44.entities.Phasen_Erfahrungswerte.list('-projektart', 200),
      ]);
      const k = kap[0]; if (k) { setConfig(k); setWeeklyHours(k.woechentliche_zielstunden || 25); setStundensatz(k.stundensatz_standard || getDefaultStundensatz()); setSteuerPct(k.steuerrueckstellung_prozent || getDefaultSteuerProzent()); }
      const mStr = currentMonth();
      setBookedHours(zeiten.filter(z => z.datum?.startsWith(mStr) && !z.timer_laeuft).reduce((s, z) => s + (z.stunden || 0), 0));
      setUpcoming(phasen.filter(p => p.status !== 'Abgeschlossen').reduce((s, p) => { const erfasst = zeiten.filter(z => z.phase_id === p.id && !z.timer_laeuft).reduce((s2, z) => s2 + (z.stunden || 0), 0); return s + Math.max(0, (p.stunden_geschaetzt || 0) - erfasst); }, 0));
      setErfahrungswerte(erf);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const monthlyRevenue = (weeklyHours * stundensatz * 52) / 12;
  const yearlyRevenue = weeklyHours * stundensatz * (52 - urlaub);
  const steuer = monthlyRevenue * steuerPct / 100;
  const netto = monthlyRevenue - steuer;

  const byArt = {};
  erfahrungswerte.forEach(e => { if (!byArt[e.projektart]) byArt[e.projektart] = { total: 0, count: 0 }; byArt[e.projektart].total += e.durchschnitt_stunden || 0; byArt[e.projektart].count = Math.max(byArt[e.projektart].count, e.anzahl_projekte || 0); });
  const avgProjectSize = Object.values(byArt).length > 0 ? Object.values(byArt).reduce((s, v) => s + v.total, 0) / Object.values(byArt).length : 0;
  const neededProjects = avgProjectSize > 0 ? Math.ceil((weeklyHours * 4) / avgProjectSize) : 0;

  const monthlyCapacity = weeklyHours * 4;
  const freeCapacity = monthlyCapacity - bookedHours - upcoming;
  const utilization = monthlyCapacity > 0 ? ((bookedHours + upcoming) / monthlyCapacity) * 100 : 0;

  const handleSave = async () => {
    setSaving(true);
    try {
      if (config?.id) { await base44.entities.Kapazitaetseinstellung.update(config.id, { woechentliche_zielstunden: Number(weeklyHours), stundensatz_standard: Number(stundensatz) }); }
      else { const c = await base44.entities.Kapazitaetseinstellung.create({ woechentliche_zielstunden: Number(weeklyHours), stundensatz_standard: Number(stundensatz), steuerrueckstellung_prozent: steuerPct, monatliches_umsatzziel: monthlyRevenue }); setConfig(c); }
      saveSettings({ woechentliche_zielstunden: Number(weeklyHours), stundensatz_standard: Number(stundensatz), steuerrueckstellung_prozent: steuerPct, monatliches_umsatzziel: monthlyRevenue, erfahrungswerte: {}, warning_threshold: 80 });
      toast.success('Gespeichert');
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Planung...</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-bold">Kapazität & Planung</h1>

      <div>
        <h2 className="font-semibold mb-3">Mein Übergangs-Planer</h2>
        <div className="grid md:grid-cols-3 gap-4">
          <Card className="p-5 shadow-sm"><p className="text-sm text-muted-foreground mb-2">Stunden pro Woche</p><p className="text-3xl font-bold text-brand-dark mb-3">{weeklyHours} h</p><Slider value={[weeklyHours]} onValueChange={v => setWeeklyHours(v[0])} min={5} max={40} step={1} /></Card>
          <Card className="p-5 shadow-sm"><p className="text-sm text-muted-foreground mb-2">Stundensatz</p><div className="flex items-baseline gap-1 mb-3"><Input type="number" value={stundensatz} onChange={e => setStundensatz(e.target.value)} className="text-2xl font-bold border-0 p-0 h-auto bg-transparent focus-visible:ring-0" /><span className="text-muted-foreground">€/h</span></div></Card>
          <Card className="p-5 shadow-sm"><p className="text-sm text-muted-foreground mb-2">Urlaub/Krank (Wochen/Jahr)</p><p className="text-3xl font-bold text-brand-dark mb-3">{urlaub}</p><Slider value={[urlaub]} onValueChange={v => setUrlaub(v[0])} min={0} max={10} step={1} /></Card>
        </div>
      </div>

      <div>
        <h2 className="font-semibold mb-3">Prognose</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Card className="p-4 shadow-sm"><div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3 h-3" /> Monatlich</div><p className="text-xl font-bold text-brand-dark">{formatCurrency(monthlyRevenue)}</p></Card>
          <Card className="p-4 shadow-sm"><div className="flex items-center gap-1 text-xs text-muted-foreground mb-1"><TrendingUp className="w-3 h-3" /> Jährlich</div><p className="text-xl font-bold text-brand-dark">{formatCurrency(yearlyRevenue)}</p></Card>
          <Card className="p-4 shadow-sm"><div className="text-xs text-muted-foreground mb-1">Steuerrücklage ({steuerPct}%)</div><p className="text-xl font-bold text-destructive">{formatCurrency(steuer)}</p></Card>
          <Card className="p-4 shadow-sm"><div className="text-xs text-muted-foreground mb-1">Netto verfügbar</div><p className="text-xl font-bold text-status-abgeschlossen">{formatCurrency(netto)}</p><p className="text-[10px] text-muted-foreground mt-1">Vereinfachte Schätzung</p></Card>
        </div>
        {avgProjectSize > 0 && <p className="text-sm text-muted-foreground mt-3">📈 Bei ø {avgProjectSize.toFixed(0)} h pro Projekt brauchst du ca. <b className="text-brand-dark">{neededProjects} Aufträge/Monat</b> um {weeklyHours}h zu füllen.</p>}
      </div>

      <Card className={cn('p-5 shadow-sm', utilization >= 100 ? 'border-2 border-red-400' : utilization < 60 ? 'border-2 border-brand' : '')}>
        <div className="flex items-center gap-2 mb-4"><BarChart3 className="w-5 h-5 text-brand" /><h2 className="font-semibold">Auslastung</h2></div>
        <div className="grid grid-cols-3 gap-4 mb-3">
          <div><p className="text-xs text-muted-foreground">Gebucht (diesen Monat)</p><p className="text-lg font-bold">{bookedHours.toFixed(1)} h</p></div>
          <div><p className="text-xs text-muted-foreground">Kommende Aufträge</p><p className="text-lg font-bold text-amber-600">{upcoming.toFixed(1)} h</p></div>
          <div><p className="text-xs text-muted-foreground">Freie Kapazität</p><p className={cn('text-lg font-bold', freeCapacity < 0 ? 'text-red-600' : 'text-status-abgeschlossen')}>{freeCapacity.toFixed(1)} h</p></div>
        </div>
        {utilization >= 100 && <div className="flex items-center gap-2 p-3 bg-red-50 rounded-xl"><AlertTriangle className="w-5 h-5 text-red-600 shrink-0" /><p className="text-sm font-medium text-red-700">Du bist überbucht! {(bookedHours + upcoming).toFixed(1)}h gebucht, nur {monthlyCapacity}h Kapazität.</p></div>}
        {utilization < 60 && utilization > 0 && <div className="flex items-center gap-2 p-3 bg-brand-light rounded-xl"><p className="text-sm font-medium text-brand-dark">Noch {freeCapacity.toFixed(1)}h Kapazität frei — neue Aufträge akquirieren?</p></div>}
      </Card>

      {Object.keys(byArt).length > 0 && (
        <Card className="p-5 shadow-sm">
          <h2 className="font-semibold mb-3">Erfahrungswerte</h2>
          <div className="space-y-2">{Object.entries(byArt).map(([art, data]) => <div key={art} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"><div><p className="font-medium">{art}</p><p className="text-xs text-muted-foreground">Basierend auf {data.count} Projekten</p></div><p className="font-bold text-brand-dark">{data.total.toFixed(1)} h</p></div>)}</div>
        </Card>
      )}

      <Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full"><Save className="w-4 h-4 mr-1" /> {saving ? 'Speichert...' : 'Einstellungen speichern'}</Button>
    </div>
  );
}