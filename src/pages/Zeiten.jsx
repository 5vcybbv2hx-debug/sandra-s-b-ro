import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Timer as TimerIcon, Plus, Play, Square } from 'lucide-react';
import { useTimer } from '@/lib/TimerContext';
import { formatDate, todayISO } from '@/lib/format';
import { getWeeklyCapacity } from '@/lib/settings';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const WEEKDAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];

export default function Zeiten() {
  const { activeTimer, elapsed, project, stopTimer, startTimer } = useTimer();
  const [eintraege, setEintraege] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [phasen, setPhasen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('day');
  const [timerForm, setTimerForm] = useState({ projekt_id: '', phase_id: '', beschreibung: '' });
  const [manualForm, setManualForm] = useState({ projekt_id: '', phase_id: '', datum: todayISO(), stunden: '', beschreibung: '' });

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const [e, p, ph] = await Promise.all([base44.entities.Zeiteintrag.list('-datum', 500), base44.entities.Projekt.list('-updated_date', 200), base44.entities.Projektphase.list('-updated_date', 500)]); setEintraege(e.filter((x) => !x.timer_laeuft)); setProjekte(p); setPhasen(ph); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '—';
  const projPhases = (pid) => phasen.filter((ph) => ph.projekt_id === pid);
  const capacity = getWeeklyCapacity();
  const today = todayISO();

  const handleStartTimer = async () => { if (!timerForm.projekt_id) return; await startTimer(timerForm.projekt_id, timerForm.beschreibung, timerForm.phase_id); setTimerForm({ projekt_id: '', phase_id: '', beschreibung: '' }); toast.success('Timer gestartet'); };

  const handleManualSave = async () => {
    if (!manualForm.projekt_id || !manualForm.stunden) return;
    try { await base44.entities.Zeiteintrag.create({ projekt_id: manualForm.projekt_id, phase_id: manualForm.phase_id || undefined, datum: manualForm.datum, stunden: parseFloat(manualForm.stunden), beschreibung: manualForm.beschreibung || 'Manuell' }); setManualForm({ ...manualForm, stunden: '', beschreibung: '' }); loadData(); toast.success('Zeit gebucht'); }
    catch (e) { toast.error('Fehler'); }
  };

  const handleDelete = async (id) => { await base44.entities.Zeiteintrag.delete(id); loadData(); };

  const now = new Date(); const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);

  const weekEntries = eintraege.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); return d >= monday && d <= sunday; });
  const weekHours = weekEntries.reduce((s, e) => s + (e.stunden || 0), 0);
  const weekData = WEEKDAYS.map((day, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const dayStr = d.toISOString().split('T')[0]; return { day, stunden: eintraege.filter((e) => e.datum === dayStr).reduce((s, e) => s + (e.stunden || 0), 0) }; });

  const todayEntries = eintraege.filter((e) => e.datum === today).sort((a, b) => (b.datum || '') > (a.datum || '') ? 1 : -1);
  const todayHours = todayEntries.reduce((s, e) => s + (e.stunden || 0), 0);

  const byProject = {}; eintraege.forEach((e) => { if (!byProject[e.projekt_id]) byProject[e.projekt_id] = []; byProject[e.projekt_id].push(e); });

  const inputCls = 'min-h-[48px]';

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Zeiterfassung</h1>
        <div className="flex gap-1 bg-cardbg rounded-xl p-1">
          {[['day', 'Tag'], ['week', 'Woche'], ['project', 'Projekt']].map(([v, l]) => <button key={v} onClick={() => setView(v)} className={cn('px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]', view === v ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>{l}</button>)}
        </div>
      </div>

      {activeTimer && (<Card className="p-5 bg-brand text-white border-0 shadow-md"><div className="flex items-center justify-between"><div className="flex items-center gap-3 min-w-0"><TimerIcon className="w-5 h-5 shrink-0" /><div className="min-w-0"><p className="text-sm text-white/80">Laufender Timer</p><p className="font-semibold truncate">{project?.projekt_name || 'Projekt'}</p></div></div><div className="flex items-center gap-3 shrink-0"><span className="font-mono text-xl font-bold tabular-nums">{Math.floor(elapsed / 3600)}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}</span><button onClick={stopTimer} className="bg-white text-brand rounded-full px-4 py-2 text-sm font-semibold min-h-[40px]">Stop</button></div></div></Card>)}

      {!activeTimer && (
        <Card className="p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3"><Play className="w-4 h-4 text-brand" /><h3 className="font-medium">Timer starten</h3></div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Select value={timerForm.projekt_id} onValueChange={(v) => setTimerForm({ ...timerForm, projekt_id: v, phase_id: '' })}><SelectTrigger className={inputCls}><SelectValue placeholder="Projekt" /></SelectTrigger><SelectContent>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
            <Select value={timerForm.phase_id} onValueChange={(v) => setTimerForm({ ...timerForm, phase_id: v })}><SelectTrigger className={inputCls}><SelectValue placeholder="Phase (optional)" /></SelectTrigger><SelectContent><SelectItem value={null}>Keine Phase</SelectItem>{timerForm.projekt_id && projPhases(timerForm.projekt_id).map((ph) => <SelectItem key={ph.id} value={ph.id}>{ph.phase}</SelectItem>)}</SelectContent></Select>
            <Input value={timerForm.beschreibung} onChange={(e) => setTimerForm({ ...timerForm, beschreibung: e.target.value })} placeholder="Beschreibung" className={inputCls} />
          </div>
          <Button onClick={handleStartTimer} disabled={!timerForm.projekt_id} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full mt-2"><Play className="w-4 h-4 mr-1" /> Start</Button>
        </Card>
      )}

      <Card className="p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3"><Plus className="w-4 h-4 text-accent" /><h3 className="font-medium">Manuell buchen</h3></div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Input type="date" value={manualForm.datum} onChange={(e) => setManualForm({ ...manualForm, datum: e.target.value })} className={inputCls} />
          <Select value={manualForm.projekt_id} onValueChange={(v) => setManualForm({ ...manualForm, projekt_id: v, phase_id: '' })}><SelectTrigger className={inputCls}><SelectValue placeholder="Projekt" /></SelectTrigger><SelectContent>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
          <Input type="number" step="0.25" value={manualForm.stunden} onChange={(e) => setManualForm({ ...manualForm, stunden: e.target.value })} placeholder="Stunden" className={inputCls} />
          <Input value={manualForm.beschreibung} onChange={(e) => setManualForm({ ...manualForm, beschreibung: e.target.value })} placeholder="Beschreibung" className={inputCls} />
        </div>
        <Button onClick={handleManualSave} disabled={!manualForm.projekt_id || !manualForm.stunden} className="bg-accent hover:bg-accent-dark text-white min-h-[48px] w-full mt-2">Buchen</Button>
      </Card>

      {loading ? <p className="text-muted-foreground text-center py-8">Lade...</p> : view === 'day' ? (
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Heute · {formatDate(today)}</h2><span className="text-lg font-bold text-brand-dark">{todayHours.toFixed(1)} h</span></div>
          <div className="space-y-2">{todayEntries.map((e) => (<div key={e.id} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"><div className="min-w-0"><p className="font-medium">{e.stunden} h</p><p className="text-sm text-muted-foreground truncate">{projName(e.projekt_id)} {e.beschreibung && `· ${e.beschreibung}`}</p></div><button onClick={() => handleDelete(e.id)} className="text-muted-foreground hover:text-destructive text-sm shrink-0">Löschen</button></div>))}{todayEntries.length === 0 && <p className="text-muted-foreground text-center py-4">Keine Einträge heute.</p>}</div>
        </Card>
      ) : view === 'week' ? (
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Diese Woche</h2><span className="text-lg font-bold text-brand-dark">{weekHours.toFixed(1)} / {capacity} h</span></div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={weekData}><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(v) => `${v} h`} /><Bar dataKey="stunden" fill="#00A8C8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </Card>
      ) : (
        <div className="space-y-3">{Object.entries(byProject).map(([pid, entries]) => { const hours = entries.reduce((s, e) => s + (e.stunden || 0), 0); return (<Card key={pid} className="p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><h3 className="font-medium">{projName(pid)}</h3><span className="font-bold text-brand-dark">{hours.toFixed(1)} h</span></div><div className="space-y-1">{entries.slice(0, 5).map((e) => <div key={e.id} className="flex items-center justify-between text-sm p-2 min-h-[40px]"><span className="text-muted-foreground">{formatDate(e.datum)}</span><span>{e.stunden} h</span><span className="text-muted-foreground truncate ml-2">{e.beschreibung}</span></div>)}</div></Card>); })}</div>
      )}
    </div>
  );
}