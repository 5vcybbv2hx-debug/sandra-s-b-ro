import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Timer as TimerIcon } from 'lucide-react';
import { useTimer } from '@/lib/TimerContext';
import { formatDate, formatDuration } from '@/lib/format';
import { getWeeklyCapacity, getWarningThreshold } from '@/lib/settings';

export default function Zeiten() {
  const { activeTimer, elapsed, project, stopTimer } = useTimer();
  const [eintraege, setEintraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [projektFilter, setProjektFilter] = useState('all');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [e, p] = await Promise.all([
        base44.entities.Zeiteintrag.list('-datum', 500),
        base44.entities.Projekt.list('-updated_date', 200),
      ]);
      setEintraege(e); setProjekte(p);
    } catch (err) { console.error(err); } finally { setLoading(false); }
  };

  const now = new Date();
  const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);

  const weekEntries = eintraege.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); return d >= monday && d <= sunday; });
  const weekHours = weekEntries.reduce((sum, e) => sum + (e.stunden || 0), 0);
  const capacity = getWeeklyCapacity();
  const threshold = getWarningThreshold();
  const utilization = capacity > 0 ? (weekHours / capacity) * 100 : 0;
  const status = utilization >= 100 ? { label: 'Überlastung', bar: 'bg-red-500', chip: 'bg-red-50 text-red-600' }
    : utilization >= threshold ? { label: 'Fast ausgelastet', bar: 'bg-amber-500', chip: 'bg-amber-50 text-amber-600' }
    : { label: 'Auf Kurs', bar: 'bg-green-500', chip: 'bg-green-50 text-green-600' };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '—';
  let filtered = eintraege;
  if (projektFilter !== 'all') filtered = eintraege.filter((e) => e.projekt_id === projektFilter);

  const byDay = {};
  filtered.forEach((e) => { const day = e.datum || 'Ohne Datum'; if (!byDay[day]) byDay[day] = []; byDay[day].push(e); });
  const days = Object.keys(byDay).sort().reverse();

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">Zeiten</h1>
      {activeTimer && (
        <Card className="p-5 bg-brand text-white border-0 shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0"><TimerIcon className="w-5 h-5 shrink-0" /><div className="min-w-0"><p className="text-sm text-white/80">Laufender Timer</p><p className="font-semibold truncate">{project?.projekt_name || 'Projekt'}</p></div></div>
            <div className="flex items-center gap-3 shrink-0"><span className="font-mono text-xl font-bold tabular-nums">{formatDuration(elapsed)}</span><button onClick={stopTimer} className="bg-white text-brand rounded-full px-4 py-2 text-sm font-semibold min-h-[40px]">Stop</button></div>
          </div>
        </Card>
      )}
      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3"><h2 className="font-semibold">Diese Woche</h2><span className={`text-xs font-medium px-2.5 py-1 rounded-full ${status.chip}`}>{status.label}</span></div>
        <div className="flex items-baseline gap-2 mb-3"><span className="text-3xl font-bold text-brand-dark">{weekHours.toFixed(1)}</span><span className="text-muted-foreground">/ {capacity} h geplant</span></div>
        <div className="w-full bg-cardbg rounded-full h-3 overflow-hidden"><div className={`h-full rounded-full transition-all ${status.bar}`} style={{ width: `${Math.min(100, utilization)}%` }} /></div>
        <p className="text-sm text-muted-foreground mt-2">{utilization.toFixed(0)}% Auslastung</p>
      </Card>
      <Select value={projektFilter} onValueChange={setProjektFilter}><SelectTrigger className="w-full md:w-72 min-h-[48px]"><SelectValue placeholder="Projekt filtern" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Projekte</SelectItem>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
      {loading ? (<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-cardbg rounded-2xl animate-pulse" />)}</div>) : (
        <div className="space-y-4">
          {days.map((day) => (
            <div key={day}>
              <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium text-muted-foreground">{formatDate(day)}</p><span className="text-sm text-muted-foreground">{byDay[day].reduce((s, e) => s + (e.stunden || 0), 0).toFixed(1)} h</span></div>
              <div className="space-y-2">
                {byDay[day].map((e) => (
                  <div key={e.id} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]">
                    <div className="min-w-0"><p className="font-medium">{e.stunden} h {e.erfassungsart === 'Timer' && <span className="text-xs text-brand">⏱</span>}</p><p className="text-sm text-muted-foreground truncate">{projName(e.projekt_id)} {e.beschreibung && `· ${e.beschreibung}`}</p></div>
                    {e.phase && <span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full shrink-0">{e.phase}</span>}
                  </div>
                ))}
              </div>
            </div>
          ))}
          {days.length === 0 && <p className="text-muted-foreground text-center py-8">Keine Zeiteinträge.</p>}
        </div>
      )}
    </div>
  );
}