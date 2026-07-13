import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { formatCurrency, monthLabel } from '@/lib/format';
import { getWeeklyCapacity, getDefaultStundensatz, getDefaultSteuerProzent, getMonthlyUmsatzziel } from '@/lib/settings';
import { AlertTriangle } from 'lucide-react';

export default function Finanzen() {
  const [monat, setMonat] = useState(() => { const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });
  const [eintraege, setEintraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const months = Array.from({ length: 12 }, (_, i) => { const d = new Date(new Date().getFullYear(), i, 1); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`; });

  useEffect(() => { loadData(); }, [monat]);
  const loadData = async () => { setLoading(true); try { const [e, p] = await Promise.all([base44.entities.Zeiteintrag.list('-datum', 500), base44.entities.Projekt.list('-updated_date', 200)]); setEintraege(e.filter((x) => !x.timer_laeuft && x.datum?.startsWith(monat))); setProjekte(p.filter((p) => p.status === 'Aktiv')); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const stundensatz = getDefaultStundensatz();
  const steuerProzent = getDefaultSteuerProzent();
  const monatsziel = getMonthlyUmsatzziel();
  const wochenziel = getWeeklyCapacity();

  const stunden = eintraege.reduce((s, e) => s + (e.stunden || 0), 0);
  const nichtAbgerechnet = eintraege.filter((e) => !e.ist_abgerechnet);
  const stundenOffen = nichtAbgerechnet.reduce((s, e) => s + (e.stunden || 0), 0);
  const umsatzStunden = stunden * stundensatz;
  const pauschalBetraege = projekte.filter((p) => p.abrechnungsart === 'Pauschal' && p.ist_abgerechnet).reduce((s, p) => s + (p.pauschalbetrag || 0), 0);
  const umsatzGesamt = umsatzStunden + pauschalBetraege;
  const steuer = umsatzGesamt * steuerProzent / 100;
  const netto = umsatzGesamt - steuer;
  const progress = monatsziel > 0 ? Math.min(100, (umsatzGesamt / monatsziel) * 100) : 0;

  const projektStunden = {}; eintraege.forEach((e) => { projektStunden[e.projekt_id] = (projektStunden[e.projekt_id] || 0) + (e.stunden || 0); });
  const projektUmsatz = projekte.map((p) => { const st = projektStunden[p.id] || 0; const betrag = p.abrechnungsart === 'Pauschal' ? (p.ist_abgerechnet ? p.pauschalbetrag : 0) : st * (p.stundensatz || stundensatz); return { ...p, stunden: st, betrag }; }).filter((p) => p.stunden > 0 || p.betrag > 0);

  const now = new Date(); const dayOfWeek = (now.getDay() + 6) % 7; const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0); const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);
  const weekHours = eintraege.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); return d >= monday && d <= sunday; }).reduce((s, e) => s + (e.stunden || 0), 0);
  const weekUeber = weekHours > wochenziel;

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Finanzen...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3"><h1 className="text-2xl md:text-3xl font-bold">Finanzen</h1><Select value={monat} onValueChange={setMonat}><SelectTrigger className="w-56 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{months.map((m) => <SelectItem key={m} value={m}>{monthLabel(m)}</SelectItem>)}</SelectContent></Select></div>
      <p className="text-lg font-semibold capitalize">{monthLabel(monat)}</p>
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="p-5 shadow-sm"><h3 className="font-semibold mb-4">Stunden & Umsatz</h3><div className="space-y-3"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Erfasste Stunden</span><span className="font-medium">{stunden.toFixed(1)} h</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Hochgerechneter Umsatz</span><span className="font-bold text-brand-dark">{formatCurrency(umsatzGesamt)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Davon abgerechnet</span><span className="text-status-abgeschlossen">{formatCurrency(umsatzGesamt - stundenOffen * stundensatz)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Noch offen</span><span className="text-amber-600">{formatCurrency(stundenOffen * stundensatz)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Steuerrücklage ({steuerProzent}%)</span><span className="text-destructive">{formatCurrency(steuer)}</span></div><div className="flex justify-between p-3 bg-cardbg rounded-xl"><span className="font-semibold">Netto verfügbar</span><span className="font-bold text-brand-dark">{formatCurrency(netto)}</span></div></div></Card>
        <Card className="p-5 shadow-sm"><h3 className="font-semibold mb-4">Monatsziel</h3><div className="flex items-baseline gap-2 mb-3"><span className="text-3xl font-bold text-brand-dark">{formatCurrency(umsatzGesamt)}</span><span className="text-muted-foreground">/ {formatCurrency(monatsziel)}</span></div><Progress value={progress} className="h-3" /><p className="text-sm text-muted-foreground mt-2">{progress.toFixed(0)}% des Monatsziels</p><div className="mt-4 p-3 bg-cardbg rounded-xl"><p className="text-sm text-muted-foreground">Bei {wochenziel} h/Woche erreichst du ca.</p><p className="text-lg font-bold text-brand-dark">{formatCurrency(wochenziel * 4 * stundensatz)} / Monat</p></div></Card>
      </div>
      {weekUeber && (<Card className="p-4 bg-amber-50 border-2 border-amber-200 shadow-sm"><div className="flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" /><p className="text-sm font-medium text-amber-700">Du hast diese Woche bereits {weekHours.toFixed(1)} von {wochenziel} h verplant.</p></div></Card>)}
      <Card className="p-5 shadow-sm"><div className="flex items-center justify-between mb-4"><h3 className="font-semibold">Projektumsätze — {monthLabel(monat)}</h3><span className="text-lg font-bold text-brand-dark">{formatCurrency(projektUmsatz.reduce((s, p) => s + p.betrag, 0))}</span></div><div className="overflow-x-auto"><table className="w-full text-sm"><thead><tr className="border-b border-border text-left text-muted-foreground"><th className="py-2 pr-4 font-medium">Projekt</th><th className="py-2 pr-4 font-medium text-right">Stunden</th><th className="py-2 pr-4 font-medium text-right">Satz</th><th className="py-2 pr-4 font-medium text-right">Umsatz</th><th className="py-2 font-medium text-center">Abgerechnet</th></tr></thead><tbody>{projektUmsatz.map((p) => (<tr key={p.id} className="border-b border-border/50"><td className="py-2 pr-4 truncate max-w-[200px]">{p.projekt_name}</td><td className="py-2 pr-4 text-right">{p.stunden.toFixed(1)} h</td><td className="py-2 pr-4 text-right">{p.abrechnungsart === 'Pauschal' ? 'Pauschal' : formatCurrency(p.stundensatz)}</td><td className="py-2 pr-4 text-right font-medium">{formatCurrency(p.betrag)}</td><td className="py-2 text-center">{p.ist_abgerechnet ? '✓' : '—'}</td></tr>))}{projektUmsatz.length === 0 && <tr><td colSpan={5} className="py-4 text-center text-muted-foreground">Keine Umsätze in diesem Monat.</td></tr>}</tbody></table></div></Card>
    </div>
  );
}