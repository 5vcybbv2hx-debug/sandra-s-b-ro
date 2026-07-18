import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2, Phone, Plus, TrendingUp } from 'lucide-react';
import Morgenroutine from '@/components/Morgenroutine';
import { formatCurrency, todayISO, currentMonth } from '@/lib/format';
import { getWeeklyCapacity, getDefaultStundensatz, getDefaultSteuerProzent, getMonthlyUmsatzziel } from '@/lib/settings';
import { cn } from '@/lib/utils';

const prioBadge = { A: 'bg-red-50 text-red-600', B: 'bg-orange-50 text-orange-600', C: 'bg-gray-100 text-gray-500' };

export default function Home() {
  const { user } = useAuth();
  const [showMorgenroutine, setShowMorgenroutine] = useState(false);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') return;
    const last = localStorage.getItem('sandra_morgenroutine');
    if (last !== new Date().toISOString().split('T')[0]) setShowMorgenroutine(true);
    loadData();
  }, [user]);

  if (user?.role === 'admin') return <Navigate to="/projekte" replace />;
  if (showMorgenroutine) return <Morgenroutine onComplete={() => { setShowMorgenroutine(false); loadData(); }} />;

  const loadData = async () => {
    try {
      const [aufgaben, notizen, projekte, firmen, zeiten, phasen, kap] = await Promise.all([
        base44.entities.Aufgabe.filter({ erledigt: false }),
        base44.entities.Telefonnotiz.filter({ erledigt: false }),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 50),
        base44.entities.Firma.list('-name', 200),
        base44.entities.Zeiteintrag.list('-datum', 500),
        base44.entities.Projektphase.list('-updated_date', 500),
        base44.entities.Kapazitaetseinstellung.list(),
      ]);
      const focused = aufgaben.filter(t => t.heute_fokussiert);
      const unfocused = aufgaben.filter(t => !t.heute_fokussiert).sort((a, b) => ({ A: 0, B: 1, C: 2 }[a.prioritaet] ?? 3) - ({ A: 0, B: 1, C: 2 }[b.prioritaet] ?? 3));
      const topTasks = [...focused, ...unfocused].slice(0, 3);
      const callbacks = notizen.filter(n => n.naechster_schritt);
      const now = new Date(); const dow = (now.getDay() + 6) % 7;
      const monday = new Date(now); monday.setDate(now.getDate() - dow); monday.setHours(0,0,0,0);
      const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23,59,59,999);
      const weekHours = zeiten.filter(z => z.datum && !z.timer_laeuft && (() => { const dd = new Date(z.datum); return dd >= monday && dd <= sunday; })()).reduce((s, z) => s + (z.stunden || 0), 0);
      const monthStr = currentMonth();
      const monthHours = zeiten.filter(z => z.datum?.startsWith(monthStr) && !z.timer_laeuft).reduce((s, z) => s + (z.stunden || 0), 0);
      const sRate = kap[0]?.stundensatz_standard || getDefaultStundensatz();
      const sPct = kap[0]?.steuerrueckstellung_prozent || getDefaultSteuerProzent();
      const mGoal = kap[0]?.monatliches_umsatzziel || getMonthlyUmsatzziel();
      const wGoal = kap[0]?.woechentliche_zielstunden || getWeeklyCapacity();
      setD({ topTasks, callbacks, projects: projekte.slice(0, 6), firmen, zeiten, phasen, weekHours, wGoal, monthRevenue: monthHours * sRate, steuer: monthHours * sRate * sPct / 100, mGoal, openTasks: aufgaben.length, openCallbacks: callbacks.length, activeProjects: projekte.length });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const toggleTask = async (t) => { await base44.entities.Aufgabe.update(t.id, { erledigt: true, erledigt_am: todayISO(), heute_fokussiert: false }); loadData(); };
  const toggleCallback = async (n) => { await base44.entities.Telefonnotiz.update(n.id, { erledigt: true }); loadData(); };
  const quickAdd = async () => { if (!newTask.trim()) return; await base44.entities.Aufgabe.create({ titel: newTask, prioritaet: 'B', heute_fokussiert: true, erledigt: false }); setNewTask(''); loadData(); };

  const firmaName = (fid) => d?.firmen.find(f => f.id === fid)?.name || '';
  const phaseProgress = (pid, phase) => { const ph = d?.phasen.find(p => p.projekt_id === pid && p.phase === (phase || 'Entwurf')); if (!ph) return { ist: 0, geschaetzt: 0 }; const ist = d.zeiten.filter(z => z.phase_id === ph.id && !z.timer_laeuft).reduce((s, z) => s + (z.stunden || 0), 0); return { ist, geschaetzt: ph.stunden_geschaetzt || 0 }; };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';
  const dateStr = new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  if (loading || !d) return <div className="p-8 text-center text-muted-foreground">Lade Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{greeting}, Sandra</h1>
        <p className="text-muted-foreground capitalize">{dateStr}</p>
        <p className="text-sm text-muted-foreground mt-1">Du hast <b className="text-foreground">{d.openTasks} offene Aufgaben</b>, <b className="text-foreground">{d.openCallbacks} offene Rückrufe</b>, <b className="text-foreground">{d.activeProjects} aktive Projekte</b></p>
      </div>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><CheckCircle2 className="w-5 h-5 text-brand" /><h2 className="font-semibold text-lg">Heute im Fokus</h2></div>
        {d.topTasks.length === 0 ? <p className="text-center py-4 text-status-abgeschlossen font-medium">Nichts geplant — relax oder an größere Projekte arbeiten 🌿</p> : (
          <div className="space-y-2">{d.topTasks.map(t => (
            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cardbg min-h-[48px]">
              <button onClick={() => toggleTask(t)} className="w-6 h-6 rounded-full border-2 border-brand shrink-0 hover:bg-brand-light" />
              <div className="flex-1 min-w-0"><span className="font-medium block truncate">{t.titel}</span>{t.projekt_id && <span className="text-xs text-muted-foreground">{firmaName(t.projekt_id)}</span>}</div>
              <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full', prioBadge[t.prioritaet] || prioBadge.C)}>{t.prioritaet}</span>
            </div>
          ))}</div>
        )}
        <div className="mt-3 flex gap-2"><Input value={newTask} onChange={e => setNewTask(e.target.value)} onKeyDown={e => e.key === 'Enter' && quickAdd()} placeholder="Aufgabe für heute hinzufügen..." className="min-h-[48px]" /><button onClick={quickAdd} className="bg-brand text-white rounded-xl px-4 min-h-[48px] shrink-0"><Plus className="w-5 h-5" /></button></div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-accent" /><h2 className="font-semibold text-lg">Offene Rückrufe</h2></div>
        {d.callbacks.length === 0 ? <p className="text-center py-4 text-status-abgeschlossen font-medium">Keine offenen Rückrufe — perfekt! ✓</p> : (
          <div className="space-y-2">{d.callbacks.map(n => (
            <div key={n.id} className="flex items-center gap-3 p-3 bg-cardbg rounded-xl min-h-[48px]">
              <button onClick={() => toggleCallback(n)} className="w-6 h-6 rounded-full border-2 border-accent shrink-0 hover:bg-accent-light" />
              <div className="flex-1 min-w-0"><div className="flex items-center gap-2"><span className="font-medium truncate">{n.kontakt_name}</span>{n.telefonnummer && <a href={`tel:${n.telefonnummer}`} className="text-xs text-brand hover:underline shrink-0">{n.telefonnummer}</a>}</div><p className="text-sm text-muted-foreground truncate">{n.naechster_schritt}</p></div>
            </div>
          ))}</div>
        )}
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4"><h2 className="font-semibold text-lg">Aktive Projekte</h2><Link to="/projekte" className="text-sm text-brand hover:underline">Alle Projekte</Link></div>
        <div className="grid sm:grid-cols-2 gap-3">{d.projects.map(p => {
          const prog = phaseProgress(p.id, p.aktuelle_phase);
          const days = p.deadline ? Math.ceil((new Date(p.deadline) - new Date()) / 86400000) : null;
          return (<Link key={p.id} to={`/projekte/${p.id}`} className="block p-4 bg-cardbg rounded-xl hover:bg-brand-light transition-colors min-h-[48px]"><p className="font-medium truncate">{p.projekt_name}</p><p className="text-xs text-muted-foreground truncate">{firmaName(p.firma_id)}</p><div className="flex items-center gap-2 mt-2"><span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">{p.aktuelle_phase || 'Entwurf'}</span>{prog.geschaetzt > 0 && <span className="text-xs text-muted-foreground">{prog.ist.toFixed(1)}/{prog.geschaetzt}h</span>}{days !== null && days <= 7 && <span className={cn('text-xs font-medium', days < 0 ? 'text-red-600' : 'text-amber-600')}>{days < 0 ? 'überfällig' : `${days}d`}</span>}</div></Link>);
        })}</div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><TrendingUp className="w-5 h-5 text-brand" /><h2 className="font-semibold text-lg">Diese Woche</h2></div>
        <div className="grid grid-cols-3 gap-4">
          <div><p className="text-xs text-muted-foreground">Stunden</p><p className="text-lg font-bold text-brand-dark">{d.weekHours.toFixed(1)} / {d.wGoal}h</p></div>
          <div><p className="text-xs text-muted-foreground">Umsatz (Monat)</p><p className="text-lg font-bold text-brand-dark">{formatCurrency(d.monthRevenue)}</p></div>
          <div><p className="text-xs text-muted-foreground">Steuerrücklage</p><p className="text-lg font-bold text-destructive">{formatCurrency(d.steuer)}</p></div>
        </div>
        <div className="mt-3"><div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Monatsziel</span><span>{formatCurrency(d.monthRevenue)} / {formatCurrency(d.mGoal)}</span></div><Progress value={Math.min(100, d.mGoal > 0 ? (d.monthRevenue / d.mGoal) * 100 : 0)} className="h-2" /></div>
      </Card>
    </div>
  );
}