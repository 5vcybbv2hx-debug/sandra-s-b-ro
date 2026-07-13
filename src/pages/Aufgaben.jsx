import { useState, useEffect } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Check, Calendar, FolderKanban, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';

const prioConfig = {
  A: { label: 'Heute unbedingt', color: 'text-accent', border: 'border-accent', bg: 'bg-accent-light' },
  B: { label: 'Diese Woche', color: 'text-brand', border: 'border-brand', bg: 'bg-brand-light' },
  C: { label: 'Wenn Zeit bleibt', color: 'text-muted-foreground', border: 'border-border', bg: 'bg-cardbg' },
};

export default function Aufgaben() {
  const { user } = useAuth();
  const [aufgaben, setAufgaben] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPrio, setNewPrio] = useState('B');
  const [newProjekt, setNewProjekt] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [filter, setFilter] = useState('all');

  useEffect(() => { if (user?.role === 'admin') return; loadData(); }, [user]);
  if (user?.role === 'admin') return <Navigate to="/projekte" replace />;

  const loadData = async () => {
    try { const [a, p] = await Promise.all([base44.entities.Aufgabe.list('-created_date', 200), base44.entities.Projekt.list('-updated_date', 200)]); setAufgaben(a); setProjekte(p); }
    catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '';
  const today = todayISO();

  const quickAdd = async () => {
    if (!newTitle.trim()) return;
    try { await base44.entities.Aufgabe.create({ titel: newTitle, prioritaet: newPrio, projekt_id: newProjekt || undefined, erledigt: false }); setNewTitle(''); setNewPrio('B'); setNewProjekt(''); setShowQuickAdd(false); loadData(); } catch (e) { toast.error('Fehler'); }
  };

  const toggleErledigt = async (task) => { await base44.entities.Aufgabe.update(task.id, { erledigt: !task.erledigt, erledigt_am: !task.erledigt ? todayISO() : null, heute_fokussiert: false }); loadData(); };
  const changePriority = async (task, prioritaet) => { await base44.entities.Aufgabe.update(task.id, { prioritaet }); loadData(); };

  const open = aufgaben.filter((t) => !t.erledigt);
  let filtered = open;
  if (filter === 'heute') filtered = open.filter((t) => t.faellig_am <= today);
  else if (filter === 'woche') { const end = new Date(); end.setDate(end.getDate() + 7); filtered = open.filter((t) => !t.faellig_am || new Date(t.faellig_am) <= end); }
  else if (filter === 'ohne') filtered = open.filter((t) => !t.projekt_id);

  const groupA = filtered.filter((t) => t.prioritaet === 'A');
  const groupB = filtered.filter((t) => t.prioritaet === 'B');
  const groupC = filtered.filter((t) => t.prioritaet === 'C');
  const erledigte = aufgaben.filter((t) => t.erledigt && t.erledigt_am && Date.now() - new Date(t.erledigt_am).getTime() < 86400000);

  const renderTask = (task) => (
    <div key={task.id} className="flex items-center gap-3 p-3 rounded-xl hover:bg-cardbg min-h-[48px]">
      <button onClick={() => toggleErledigt(task)} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0', task.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : prioConfig[task.prioritaet].border)}>{task.erledigt && <Check className="w-4 h-4 text-white" />}</button>
      <div className="flex-1 min-w-0"><p className="font-medium truncate">{task.titel}</p><div className="flex items-center gap-2 flex-wrap mt-0.5">{task.projekt_id && <Link to={`/projekte/${task.projekt_id}`} className="text-xs text-brand hover:underline flex items-center gap-1"><FolderKanban className="w-3 h-3" /> {projName(task.projekt_id)}</Link>}{task.faellig_am && <span className="text-xs text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(task.faellig_am)}</span>}</div></div>
      <Select value={task.prioritaet} onValueChange={(v) => changePriority(task, v)}><SelectTrigger className="w-14 h-8 min-h-[32px] text-xs shrink-0"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A</SelectItem><SelectItem value="B">B</SelectItem><SelectItem value="C">C</SelectItem></SelectContent></Select>
    </div>
  );

  const renderColumn = (tasks, prio) => {
    const config = prioConfig[prio];
    return (
      <Card className="p-4 shadow-sm flex-1 min-w-[280px]">
        <div className="flex items-center gap-2 mb-3"><span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', config.border, config.color)}>{prio}</span><h2 className={cn('font-semibold', config.color)}>{config.label}</h2><span className="text-sm text-muted-foreground">({tasks.length})</span></div>
        <div className="space-y-1">{tasks.length === 0 ? <p className="text-muted-foreground text-sm py-2">Keine Aufgaben.</p> : tasks.map(renderTask)}</div>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Aufgaben</h1>
        <Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="heute">Heute</SelectItem><SelectItem value="woche">Diese Woche</SelectItem><SelectItem value="ohne">Ohne Projekt</SelectItem></SelectContent></Select>
      </div>

      {showQuickAdd ? (
        <Card className="p-4 shadow-sm space-y-3">
          <Input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && quickAdd()} placeholder="Aufgabentitel..." className="min-h-[48px] text-base" autoFocus />
          <div className="grid grid-cols-2 gap-2">
            <Select value={newPrio} onValueChange={setNewPrio}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="A">A – Heute</SelectItem><SelectItem value="B">B – Woche</SelectItem><SelectItem value="C">C – Wenn Zeit</SelectItem></SelectContent></Select>
            <Select value={newProjekt} onValueChange={setNewProjekt}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt (optional)" /></SelectTrigger><SelectContent><SelectItem value={null}>Kein Projekt</SelectItem>{projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>
          </div>
          <div className="flex gap-2"><Button onClick={() => setShowQuickAdd(false)} variant="outline" className="min-h-[48px] flex-1">Abbrechen</Button><Button onClick={quickAdd} disabled={!newTitle.trim()} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">Speichern</Button></div>
        </Card>
      ) : (
        <button onClick={() => setShowQuickAdd(true)} className="w-full flex items-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-brand hover:text-brand transition-colors min-h-[48px]"><Plus className="w-5 h-5" /> Aufgabe hinzufügen</button>
      )}

      {loading ? <p className="text-muted-foreground text-center py-8">Lade Aufgaben...</p> : (
        <>
          <div className="hidden md:flex gap-4">{renderColumn(groupA, 'A')}{renderColumn(groupB, 'B')}{renderColumn(groupC, 'C')}</div>
          <div className="md:hidden space-y-4">{renderColumn(groupA, 'A')}{renderColumn(groupB, 'B')}{renderColumn(groupC, 'C')}</div>
          {erledigte.length > 0 && (<Card className="p-4 shadow-sm opacity-60"><h2 className="font-semibold text-muted-foreground mb-3">Erledigt ({erledigte.length})</h2><div className="space-y-1">{erledigte.map(renderTask)}</div></Card>)}
        </>
      )}
    </div>
  );
}