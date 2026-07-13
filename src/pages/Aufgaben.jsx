import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Check, ChevronDown, ChevronUp, Calendar, FolderKanban } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';

const PHASES = ['Entwurf', 'Baugesuch', 'Werkplanung'];
const isErledigt = (t) => t.status === 'Erledigt' || (t.status === undefined && t.erledigt === true);
const getStatus = (t) => t.status || (t.erledigt ? 'Erledigt' : 'Offen');

export default function Aufgaben() {
  const { user } = useAuth();
  const [aufgaben, setAufgaben] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState('day');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [newForm, setNewForm] = useState({ titel: '', prioritaet: 'B', projekt_id: '', phase: '', faellig_am: todayISO() });
  const [filterProjekt, setFilterProjekt] = useState('all');
  const [filterPhase, setFilterPhase] = useState('all');
  const [showErledigt, setShowErledigt] = useState(false);

  useEffect(() => { if (user?.role === 'admin') return; loadData(); }, [user]);
  if (user?.role === 'admin') return <Navigate to="/projekte" replace />;

  const loadData = async () => {
    try {
      const [a, p] = await Promise.all([base44.entities.Aufgabe.list('-created_date', 200), base44.entities.Projekt.list('-updated_date', 200)]);
      setAufgaben(a); setProjekte(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '';
  const today = todayISO();

  const quickAdd = async () => {
    if (!newForm.titel.trim()) return;
    try {
      await base44.entities.Aufgabe.create({ titel: newForm.titel, prioritaet: newForm.prioritaet, projekt_id: newForm.projekt_id || undefined, phase: newForm.phase || undefined, faellig_am: newForm.faellig_am || undefined, status: 'Offen', erledigt: false });
      setNewForm({ titel: '', prioritaet: 'B', projekt_id: '', phase: '', faellig_am: todayISO() }); setShowQuickAdd(false); loadData();
    } catch (e) { toast.error('Fehler'); }
  };

  const cycleStatus = async (task) => {
    const current = getStatus(task);
    const next = current === 'Offen' ? 'In Arbeit' : current === 'In Arbeit' ? 'Erledigt' : 'Offen';
    const updates = { status: next };
    if (next === 'Erledigt') { updates.erledigt = true; updates.erledigt_am = new Date().toISOString(); updates.heute_fokussiert = false; }
    else { updates.erledigt = false; updates.erledigt_am = null; }
    await base44.entities.Aufgabe.update(task.id, updates); loadData();
  };

  const changePriority = async (task, prioritaet) => { await base44.entities.Aufgabe.update(task.id, { prioritaet }); loadData(); };

  let filtered = aufgaben;
  if (filterProjekt !== 'all') filtered = filtered.filter((t) => t.projekt_id === filterProjekt);
  if (filterPhase !== 'all') filtered = filtered.filter((t) => t.phase === filterPhase);

  const now = Date.now();
  const visible = filtered.filter((t) => !isErledigt(t) || (t.erledigt_am && now - new Date(t.erledigt_am).getTime() < 86400000));
  const open = visible.filter((t) => !isErledigt(t));
  const erledigt = visible.filter((t) => isErledigt(t));

  const aTodos = open.filter((t) => t.prioritaet === 'A');
  const bTodosDueToday = open.filter((t) => t.prioritaet === 'B' && t.faellig_am <= today);
  const allADone = aTodos.length === 0 && aufgaben.some((t) => t.prioritaet === 'A');

  const groupA = open.filter((t) => t.prioritaet === 'A').sort((a, b) => (a.faellig_am || '9999') > (b.faellig_am || '9999') ? 1 : -1);
  const groupB = open.filter((t) => t.prioritaet === 'B').sort((a, b) => (a.faellig_am || '9999') > (b.faellig_am || '9999') ? 1 : -1);
  const groupC = open.filter((t) => t.prioritaet === 'C').sort((a, b) => (a.faellig_am || '9999') > (b.faellig_am || '9999') ? 1 : -1);

  const renderTask = (task, highlighted = false) => {
    const status = getStatus(task);
    return (
      <div key={task.id} className={cn('flex items-center gap-3 p-3 rounded-xl min-h-[48px] transition-colors', highlighted ? 'bg-brand-light ring-1 ring-brand' : 'hover:bg-cardbg')}>
        <button onClick={() => cycleStatus(task)} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0', status === 'Erledigt' ? 'bg-status-abgeschlossen border-status-abgeschlossen' : status === 'In Arbeit' ? 'border-brand bg-brand-light' : 'border-border')}>
          {status === 'Erledigt' && <Check className="w-4 h-4 text-white" />}
          {status === 'In Arbeit' && <div className="w-2 h-2 rounded-full bg-brand" />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={cn('font-medium truncate', isErledigt(task) && 'line-through text-muted-foreground')}>{task.titel}</p>
          <div className="flex items-center gap-2 flex-wrap mt-0.5">
            {task.projekt_id && <Link to={`/projekte/${task.projekt_id}`} className="text-xs text-brand hover:underline flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {projName(task.projekt_id)}</Link>}
            {task.phase && <span className="text-xs bg-cardbg px-1.5 py-0.5 rounded">{task.phase}</span>}
            {task.faellig_am && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(task.faellig_am)}</span>}
          </div>
        </div>
        <Select value={task.prioritaet} onValueChange={(v) => changePriority(task, v)}><SelectTrigger className="w-14 h-8 min-h-[32px] text-xs shrink-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem></SelectContent></Select>
      </div>
    );
  };

  const renderGroup = (tasks, label, color) => (
    <Card className="p-4 shadow-sm">
      <div className="flex items-center gap-2 mb-2"><span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', color)}>{label}</span><span className="text-sm text-muted-foreground">({tasks.length})</span></div>
      <div className="space-y-1">{tasks.length === 0 ? <p className="text-muted-foreground text-sm py-2">Keine Aufgaben.</p> : tasks.map((t) => renderTask(t))}</div>
    </Card>
  );

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Aufgaben</h1>
        <div className="flex gap-1 bg-cardbg rounded-xl p-1">
          <button onClick={() => setView('day')} className={cn('px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]', view === 'day' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>Tag</button>
          <button onClick={() => setView('week')} className={cn('px-4 py-2 rounded-lg text-sm font-medium min-h-[40px]', view === 'week' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>Woche</button>
        </div>
      </div>

      {showQuickAdd ? (
        <Card className="p-4 shadow-sm space-y-3">
          <Input value={newForm.titel} onChange={(e) => setNewForm({ ...newForm, titel: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Aufgabentitel..." className="min-h-[48px] text-base" autoFocus />
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
            <Select value={newForm.prioritaet} onValueChange={(v) => setNewForm({ ...newForm, prioritaet: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A – Heute</SelectItem><SelectItem value="B">B – Woche</SelectItem><SelectItem value="C">C – Wenn Zeit</SelectItem></SelectContent></Select>
            <Select value={newForm.projekt_id} onValueChange={(v) => setNewForm({ ...newForm, projekt_id: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt" /></SelectTrigger><SelectContent><SelectItem value={null}>Kein Projekt</SelectItem>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
            <Select value={newForm.phase} onValueChange={(v) => setNewForm({ ...newForm, phase: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent><SelectItem value={null}>Keine Phase</SelectItem>{PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
            <Input type="date" value={newForm.faellig_am} onChange={(e) => setNewForm({ ...newForm, faellig_am: e.target.value })} className="min-h-[48px]" />
          </div>
          <div className="flex gap-2"><Button onClick={() => setShowQuickAdd(false)} variant="outline" className="min-h-[48px] flex-1">Abbrechen</Button><Button onClick={quickAdd} disabled={!newForm.titel.trim()} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">Speichern</Button></div>
        </Card>
      ) : (
        <button onClick={() => setShowQuickAdd(true)} className="w-full flex items-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-brand hover:text-brand transition-colors min-h-[48px]"><Plus className="w-5 h-5" /> Aufgabe hinzufügen</button>
      )}

      {loading ? (<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div>) : view === 'day' ? (
        <div className="space-y-4">
          {allADone && <Card className="p-5 bg-green-50 border-2 border-green-200 shadow-sm"><p className="text-center font-semibold text-green-600">Alle Prioritäten erledigt ✓</p></Card>}
          {aTodos.length > 0 && <Card className="p-4 shadow-sm"><div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full border border-accent text-accent">A</span><h2 className="font-semibold text-accent">Heute unbedingt</h2></div><div className="space-y-1">{aTodos.map((t, i) => renderTask(t, i < 3))}</div></Card>}
          {bTodosDueToday.length > 0 && <Card className="p-4 shadow-sm"><div className="flex items-center gap-2 mb-2"><span className="text-xs font-bold px-2 py-0.5 rounded-full border border-brand text-brand">B</span><h2 className="font-semibold text-brand">Heute fällig</h2></div><div className="space-y-1">{bTodosDueToday.map((t) => renderTask(t))}</div></Card>}
          {erledigt.length > 0 && <button onClick={() => setShowErledigt(!showErledigt)} className="flex items-center gap-1 text-sm text-muted-foreground ml-2">{showErledigt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Erledigt ({erledigt.length})</button>}
          {showErledigt && erledigt.map((t) => renderTask(t))}
          {aTodos.length === 0 && bTodosDueToday.length === 0 && !allADone && <p className="text-muted-foreground text-center py-8">Nichts für heute — nutze die Wochenansicht für anstehende Aufgaben.</p>}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Select value={filterProjekt} onValueChange={setFilterProjekt}><SelectTrigger className="w-40 min-h-[40px] text-sm"><SelectValue placeholder="Projekt" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Projekte</SelectItem>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
            <Select value={filterPhase} onValueChange={setFilterPhase}><SelectTrigger className="w-32 min-h-[40px] text-sm"><SelectValue placeholder="Phase" /></SelectTrigger><SelectContent><SelectItem value="all">Alle Phasen</SelectItem>{PHASES.map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent></Select>
          </div>
          {renderGroup(groupA, 'A', 'border-accent text-accent')}
          {renderGroup(groupB, 'B', 'border-brand text-brand')}
          {renderGroup(groupC, 'C', 'border-border text-muted-foreground')}
          {erledigt.length > 0 && (<><button onClick={() => setShowErledigt(!showErledigt)} className="flex items-center gap-1 text-sm text-muted-foreground ml-2">{showErledigt ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />} Erledigt ({erledigt.length})</button>{showErledigt && <Card className="p-4 shadow-sm opacity-60"><div className="space-y-1">{erledigt.map((t) => renderTask(t))}</div></Card>}</>)}
        </div>
      )}
    </div>
  );
}