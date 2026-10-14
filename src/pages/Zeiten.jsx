import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';
import { Timer as TimerIcon, Plus, Play, Pencil, Check, X, AlertCircle } from 'lucide-react';
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
  const [personFilter, setPersonFilter] = useState('');
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editForm, setEditForm] = useState({ stunden: '', beschreibung: '' });
  const [duplicatePending, setDuplicatePending] = useState(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try { const [e, p, ph, ma] = await Promise.all([base44.entities.Zeiteintrag.list('-datum', 500), base44.entities.Projekt.list('-updated_date', 200), base44.entities.Projektphase.list('-updated_date', 500), base44.entities.Mitarbeiter.list('-name', 100).catch(() => [])]); setEintraege(e.filter((x) => !x.timer_laeuft)); setProjekte(p); setPhasen(ph); setMitarbeiter(ma); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '—';
  const projPhases = (pid) => phasen.filter((ph) => ph.projekt_id === pid);
  const capacity = getWeeklyCapacity();
  const today = todayISO();

  const handleStartTimer = async () => { if (!timerForm.projekt_id) return; await startTimer(timerForm.projekt_id, timerForm.beschreibung, timerForm.phase_id); setTimerForm({ projekt_id: '', phase_id: '', beschreibung: '' }); toast.success('Timer gestartet'); };

  const checkDuplicate = (projekt_id, datum, stunden) => {
    return eintraege.some(e => e.projekt_id === projekt_id && e.datum === datum && String(e.stunden) === String(stunden));
  };

  const handleManualSave = async (force = false) => {
    if (!manualForm.projekt_id || !manualForm.stunden) return;
    if (!force && checkDuplicate(manualForm.projekt_id, manualForm.datum, manualForm.stunden)) {
      setDuplicatePending({ ...manualForm });
      return;
    }
    try { await base44.entities.Zeiteintrag.create({ projekt_id: manualForm.projekt_id, phase_id: manualForm.phase_id || undefined, datum: manualForm.datum, stunden: parseFloat(manualForm.stunden), beschreibung: manualForm.beschreibung || 'Manuell' }); setManualForm({ ...manualForm, stunden: '', beschreibung: '' }); setDuplicatePending(null); loadData(); toast.success('Zeit gebucht'); }
    catch (e) { toast.error('Fehler'); }
  };

  const handleDelete = async (id) => { await base44.entities.Zeiteintrag.delete(id); loadData(); };

  const startEdit = (e) => { setEditingId(e.id); setEditForm({ stunden: String(e.stunden), beschreibung: e.beschreibung || '' }); };
  const cancelEdit = () => { setEditingId(null); };
  const handleSaveEdit = async () => {
    if (!editForm.stunden || isNaN(parseFloat(editForm.stunden))) return;
    try { await base44.entities.Zeiteintrag.update(editingId, { stunden: parseFloat(editForm.stunden), beschreibung: editForm.beschreibung }); setEditingId(null); loadData(); toast.success('Zeit aktualisiert'); }
    catch (e) { toast.error('Fehler'); }
  };

  const filteredEintraege = personFilter ? eintraege.filter((e) => e.created_by === personFilter) : eintraege;
  const now = new Date(); const dayOfWeek = (now.getDay() + 6) % 7;
  const monday = new Date(now); monday.setDate(now.getDate() - dayOfWeek); monday.setHours(0, 0, 0, 0);
  const sunday = new Date(monday); sunday.setDate(monday.getDate() + 6); sunday.setHours(23, 59, 59, 999);

  const weekEntries = filteredEintraege.filter((e) => { if (!e.datum) return false; const d = new Date(e.datum); return d >= monday && d <= sunday; });
  const weekHours = weekEntries.reduce((s, e) => s + (e.stunden || 0), 0);
  const weekData = WEEKDAYS.map((day, i) => { const d = new Date(monday); d.setDate(monday.getDate() + i); const dayStr = d.toISOString().split('T')[0]; return { day, stunden: filteredEintraege.filter((e) => e.datum === dayStr).reduce((s, e) => s + (e.stunden || 0), 0) }; });

  const todayEntries = filteredEintraege.filter((e) => e.datum === today).sort((a, b) => (b.datum || '') > (a.datum || '') ? 1 : -1);
  const todayHours = todayEntries.reduce((s, e) => s + (e.stunden || 0), 0);

  const byProject = {}; filteredEintraege.forEach((e) => { if (!byProject[e.projekt_id]) byProject[e.projekt_id] = []; byProject[e.projekt_id].push(e); });

  const inputCls = 'min-h-[48px]';

  return (
    <div className="p-4 md:p-8 max-w-[1150px] mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Zeiterfassung</h1>
        <div className="flex gap-1 bg-cardbg rounded-xl p-1">
          {[['day', 'Tag'], ['week', 'Woche'], ['project', 'Projekt']].map(([v, l]) => <button key={v} onClick={() => setView(v)} className={cn('px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]', view === v ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>{l}</button>)}
        </div>
      </div>

      {mitarbeiter.length > 0 && (
        <Select value={personFilter || '_all'} onValueChange={(v) => setPersonFilter(v === '_all' ? '' : v)}>
          <SelectTrigger className="min-h-[48px] max-w-xs"><SelectValue placeholder="Alle Personen" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="_all">Alle Personen</SelectItem>
            {mitarbeiter.filter(m => m.linked_email).map((m) => <SelectItem key={m.id} value={m.linked_email}>{m.name}</SelectItem>)}
          </SelectContent>
        </Select>
      )}

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
        <Button onClick={() => handleManualSave(false)} disabled={!manualForm.projekt_id || !manualForm.stunden} className="bg-accent hover:bg-accent-dark text-white min-h-[48px] w-full mt-2">Buchen</Button>
      </Card>

      {duplicatePending && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setDuplicatePending(null)}>
          <Card className="p-6 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-5 h-5 text-amber-500" />
              <h3 className="font-semibold">Schon erfasst?</h3>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Ein Eintrag mit gleichem Projekt, Datum und Stunden existiert bereits.
            </p>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setDuplicatePending(null)}>Abbrechen</Button>
              <Button className="bg-brand hover:bg-brand-dark text-white" onClick={() => handleManualSave(true)}>Trotzdem speichern</Button>
            </div>
          </Card>
        </div>
      )}

      {loading ? <p className="text-muted-foreground text-center py-8">Lade...</p> : view === 'day' ? (
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold">Heute · {formatDate(today)}</h2>
            <span className="text-lg font-bold text-brand-dark">{todayHours.toFixed(1)} h</span>
          </div>
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border text-left text-xs text-muted-foreground uppercase tracking-wide">
                  <th className="py-2 pr-4 font-medium">Projekt</th>
                  <th className="py-2 pr-4 font-medium">Beschreibung</th>
                  <th className="py-2 pr-4 font-medium w-24">Stunden</th>
                  <th className="py-2 font-medium w-24 text-right">Aktionen</th>
                </tr>
              </thead>
              <tbody>
                {todayEntries.map((e) => editingId === e.id ? (
                  <tr key={e.id} className="border-b border-border/40">
                    <td className="py-2 pr-4 text-sm font-medium truncate max-w-[200px]">{projName(e.projekt_id)}</td>
                    <td className="py-2 pr-4">
                      <Input value={editForm.beschreibung} onChange={(ev) => setEditForm({ ...editForm, beschreibung: ev.target.value })} placeholder="Beschreibung" className="h-9 min-h-[36px]" />
                    </td>
                    <td className="py-2 pr-4">
                      <div className="flex items-center gap-1">
                        <Input type="number" step="0.25" value={editForm.stunden} onChange={(ev) => setEditForm({ ...editForm, stunden: ev.target.value })} className="w-20 h-9 min-h-[36px]" />
                        <span className="text-sm text-muted-foreground">h</span>
                      </div>
                    </td>
                    <td className="py-2 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={handleSaveEdit} className="w-8 h-8 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 hover:bg-brand-dark"><Check className="w-4 h-4" /></button>
                        <button onClick={cancelEdit} className="w-8 h-8 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted/70"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  <tr key={e.id} className="border-b border-border/40 hover:bg-cardbg/50 transition-colors">
                    <td className="py-3 pr-4 text-sm font-medium truncate max-w-[200px]">{projName(e.projekt_id)}</td>
                    <td className="py-3 pr-4 text-sm text-muted-foreground truncate max-w-[300px]">{e.beschreibung || '—'}</td>
                    <td className="py-3 pr-4 font-bold text-brand-dark">{e.stunden} h</td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => startEdit(e)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {todayEntries.length === 0 && (
                  <tr><td colSpan={4} className="text-center py-6 text-muted-foreground">Keine Einträge heute.</td></tr>
                )}
              </tbody>
            </table>
          </div>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-2">
            {todayEntries.map((e) => editingId === e.id ? (
              <div key={e.id} className="p-3 bg-cardbg rounded-xl space-y-2">
                <p className="text-sm font-medium truncate">{projName(e.projekt_id)}</p>
                <div className="flex items-center gap-2">
                  <Input type="number" step="0.25" value={editForm.stunden} onChange={(ev) => setEditForm({ ...editForm, stunden: ev.target.value })} className="w-24 min-h-[40px]" />
                  <span className="text-sm text-muted-foreground">h</span>
                  <Input value={editForm.beschreibung} onChange={(ev) => setEditForm({ ...editForm, beschreibung: ev.target.value })} placeholder="Beschreibung" className="flex-1 min-h-[40px]" />
                  <button onClick={handleSaveEdit} className="w-9 h-9 rounded-lg bg-brand text-white flex items-center justify-center shrink-0 hover:bg-brand-dark"><Check className="w-4 h-4" /></button>
                  <button onClick={cancelEdit} className="w-9 h-9 rounded-lg bg-muted text-muted-foreground flex items-center justify-center shrink-0 hover:bg-muted/70"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ) : (
              <div key={e.id} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]">
                <div className="min-w-0">
                  <p className="font-medium">{e.stunden} h</p>
                  <p className="text-sm text-muted-foreground truncate">{projName(e.projekt_id)} {e.beschreibung && `· ${e.beschreibung}`}</p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => startEdit(e)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(e.id)} className="w-8 h-8 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"><X className="w-4 h-4" /></button>
                </div>
              </div>
            ))}
            {todayEntries.length === 0 && <p className="text-muted-foreground text-center py-4">Keine Einträge heute.</p>}
          </div>
        </Card>
      ) : view === 'week' ? (
        <Card className="p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4"><h2 className="font-semibold">Diese Woche</h2><span className="text-lg font-bold text-brand-dark">{weekHours.toFixed(1)} / {capacity} h</span></div>
          <ResponsiveContainer width="100%" height={200}><BarChart data={weekData}><XAxis dataKey="day" axisLine={false} tickLine={false} /><YAxis hide /><Tooltip formatter={(v) => `${v} h`} /><Bar dataKey="stunden" fill="#00A8C8" radius={[8, 8, 0, 0]} /></BarChart></ResponsiveContainer>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{Object.entries(byProject).map(([pid, entries]) => { const hours = entries.reduce((s, e) => s + (e.stunden || 0), 0); return (<Card key={pid} className="p-4 shadow-sm"><div className="flex items-center justify-between mb-2"><h3 className="font-medium truncate">{projName(pid)}</h3><span className="font-bold text-brand-dark shrink-0 ml-2">{hours.toFixed(1)} h</span></div><div className="space-y-1">{entries.slice(0, 5).map((e) => <div key={e.id} className="flex items-center justify-between text-sm p-2 min-h-[40px]"><span className="text-muted-foreground">{formatDate(e.datum)}</span><span>{e.stunden} h</span><span className="text-muted-foreground truncate ml-2">{e.beschreibung}</span></div>)}</div></Card>); })}</div>
      )}
    </div>
  );
}