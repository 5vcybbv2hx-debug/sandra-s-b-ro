import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, Clock, CheckSquare, AlertTriangle } from 'lucide-react';
import { getWeeklyCapacity } from '@/lib/settings';
import { cn } from '@/lib/utils';

const WD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Wochenuebersicht() {
  const [offset, setOffset] = useState(0);
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);

  const getWeek = (off) => { const now = new Date(); const dow = (now.getDay() + 6) % 7; const mon = new Date(now); mon.setDate(now.getDate() - dow + off * 7); mon.setHours(0,0,0,0); const sun = new Date(mon); sun.setDate(mon.getDate() + 6); return { mon, sun }; };
  const { mon, sun } = getWeek(offset);
  const today = new Date().toISOString().split('T')[0];
  const label = `${mon.toLocaleDateString('de-DE', { day: 'numeric', month: 'long' })} – ${sun.toLocaleDateString('de-DE', { day: 'numeric', month: 'long', year: 'numeric' })}`;

  useEffect(() => { loadData(); }, [offset]);

  const loadData = async () => {
    try {
      const [zeiten, aufgaben, projekte, abrechnungen] = await Promise.all([
        base44.entities.Zeiteintrag.list('-datum', 500), base44.entities.Aufgabe.list('-faellig_am', 200),
        base44.entities.Projekt.list('-deadline', 200), base44.entities.Abrechnung.list('-created_date', 200),
      ]);
      const { mon, sun } = getWeek(offset);
      const inWeek = (dateStr) => { if (!dateStr) return false; const dd = new Date(dateStr); return dd >= mon && dd <= sun; };
      const days = Array.from({ length: 7 }, (_, i) => {
        const dd = new Date(mon); dd.setDate(mon.getDate() + i); const ds = dd.toISOString().split('T')[0];
        return { date: dd, ds, hours: zeiten.filter(z => z.datum === ds && !z.timer_laeuft).reduce((s, z) => s + (z.stunden || 0), 0), tasks: aufgaben.filter(t => t.faellig_am === ds && !t.erledigt), deadlines: projekte.filter(p => p.deadline === ds), isToday: ds === today };
      });
      const weekHours = days.reduce((s, x) => s + x.hours, 0);
      const wProjects = [...new Set(zeiten.filter(z => inWeek(z.datum)).map(z => z.projekt_id))].map(pid => projekte.find(p => p.id === pid)?.projekt_name).filter(Boolean);
      const completed = aufgaben.filter(t => t.erledigt && t.erledigt_am && inWeek(t.erledigt_am)).length;
      const total = aufgaben.filter(t => t.faellig_am && inWeek(t.faellig_am)).length;
      const openInv = abrechnungen.filter(a => a.status === 'Entwurf').length;
      const dlProjects = projekte.filter(p => p.deadline && inWeek(p.deadline));
      setD({ days, weekHours, wGoal: getWeeklyCapacity(), wProjects, completed, total, openInv, dlProjects });
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading || !d) return <div className="p-8 text-center text-muted-foreground">Lade Woche...</div>;

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Wochenübersicht</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setOffset(offset - 1)} className="p-2 rounded-xl hover:bg-cardbg min-h-[40px]"><ChevronLeft className="w-5 h-5" /></button>
          <span className="text-sm font-medium min-w-[200px] text-center">{label}</span>
          <button onClick={() => setOffset(offset + 1)} className="p-2 rounded-xl hover:bg-cardbg min-h-[40px]"><ChevronRight className="w-5 h-5" /></button>
          <button onClick={() => setOffset(0)} className="ml-2 text-sm text-brand hover:underline min-h-[40px] px-2">Heute</button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-2">
        {d.days.map((day, i) => (
          <Card key={i} className={cn('p-3 shadow-sm min-h-[120px]', day.isToday && 'ring-2 ring-brand')}>
            <p className={cn('text-xs font-medium', day.isToday ? 'text-brand' : 'text-muted-foreground')}>{WD[i]}</p>
            <p className="text-lg font-bold">{day.date.getDate()}.</p>
            {day.hours > 0 && <div className="mt-2 flex items-center gap-1 text-xs text-brand-dark"><Clock className="w-3 h-3" />{day.hours.toFixed(1)}h</div>}
            {day.tasks.length > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-accent"><CheckSquare className="w-3 h-3" />{day.tasks.length}</div>}
            {day.deadlines.length > 0 && <div className="mt-1 flex items-center gap-1 text-xs text-red-600"><AlertTriangle className="w-3 h-3" />{day.deadlines.length}</div>}
          </Card>
        ))}
      </div>

      <Card className="p-5 shadow-sm">
        <h2 className="font-semibold mb-4">Wochenzusammenfassung</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><p className="text-xs text-muted-foreground">Stunden</p><p className="text-lg font-bold text-brand-dark">{d.weekHours.toFixed(1)} / {d.wGoal}h</p><Progress value={Math.min(100, d.wGoal > 0 ? (d.weekHours / d.wGoal) * 100 : 0)} className="h-2 mt-1" /></div>
          <div><p className="text-xs text-muted-foreground">Aufgaben</p><p className="text-lg font-bold">{d.completed} / {d.total || 0} erledigt</p></div>
          <div><p className="text-xs text-muted-foreground">Offene Rechnungen</p><p className="text-lg font-bold text-amber-600">{d.openInv}</p></div>
          <div><p className="text-xs text-muted-foreground">Deadlines</p><p className={cn('text-lg font-bold', d.dlProjects.length > 0 ? 'text-red-600' : 'text-muted-foreground')}>{d.dlProjects.length}</p></div>
        </div>
        {d.wProjects.length > 0 && <div className="mt-3 flex flex-wrap gap-2">{d.wProjects.map((n, i) => <span key={i} className="text-xs bg-brand-light text-brand-dark px-2 py-1 rounded-full">{n}</span>)}</div>}
        {d.dlProjects.length > 0 && <div className="mt-3 space-y-1">{d.dlProjects.map(p => <Link key={p.id} to={`/projekte/${p.id}`} className="block text-sm text-red-600 hover:underline">{p.projekt_name} — {new Date(p.deadline).toLocaleDateString('de-DE')}</Link>)}</div>}
      </Card>
    </div>
  );
}