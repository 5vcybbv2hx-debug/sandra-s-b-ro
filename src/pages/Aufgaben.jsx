import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayISO } from '@/lib/format';
import { filterByDelegation } from '@/lib/aufgabeHelpers';
import { BUCKETS, groupAufgaben } from '@/lib/aufgabeGroups';
import { toast } from 'sonner';
import AufgabeRow from '@/components/aufgaben/AufgabeRow';
import AufgabeGruppe from '@/components/aufgaben/AufgabeGruppe';
import MeinTagBlock from '@/components/aufgaben/MeinTagBlock';

const DEFAULT_OPEN = { ueberfaellig: true, heute: true, morgen: true, woche: false, spaeter: false, ohne: false };

export default function Aufgaben() {
  const { user } = useAuth();
  const [aufgaben, setAufgaben] = useState([]);
  const [erledigte, setErledigte] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPrio, setNewPrio] = useState('B');
  const [newProjekt, setNewProjekt] = useState('');
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [delegationFilter, setDelegationFilter] = useState('all');
  const [showErledigt, setShowErledigt] = useState(false);
  const [fadingIds, setFadingIds] = useState(new Set());
  const timers = useRef({});

  useEffect(() => { loadData(); }, [user]);

  const loadData = async () => {
    try {
      const [a, p] = await Promise.all([
        base44.entities.Aufgabe.list('-created_date', 200),
        base44.entities.Projekt.list('-updated_date', 200),
      ]);
      setAufgaben(a);
      setProjekte(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadErledigte = async () => {
    try {
      const all = await base44.entities.Aufgabe.filter({ erledigt: true }, { sort: '-erledigt_am', limit: 50 });
      setErledigte(all.items || all);
    } catch (e) {
      console.error(e);
    }
  };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '';

  const quickAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await base44.entities.Aufgabe.create({
        titel: newTitle, prioritaet: newPrio, projekt_id: newProjekt || undefined, erledigt: false,
      });
      setNewTitle(''); setNewPrio('B'); setNewProjekt(''); setShowQuickAdd(false);
      loadData();
    } catch (e) { toast.error('Fehler'); }
  };

  const toggleErledigt = async (task) => {
    if (!task.erledigt) {
      // wird erledigt → kurz einblenden, dann entfernen
      setFadingIds((prev) => new Set(prev).add(task.id));
      try {
        await base44.entities.Aufgabe.update(task.id, {
          erledigt: true, erledigt_am: todayISO(), heute_fokussiert: false,
        });
      } catch (e) {
        setFadingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
        toast.error('Fehler');
        return;
      }
      timers.current[task.id] = setTimeout(() => {
        setAufgaben((prev) => prev.filter((t) => t.id !== task.id));
        setFadingIds((prev) => { const n = new Set(prev); n.delete(task.id); return n; });
        delete timers.current[task.id];
      }, 900);
    } else {
      try {
        await base44.entities.Aufgabe.update(task.id, { erledigt: false, erledigt_am: null });
        loadData();
      } catch (e) { toast.error('Fehler'); }
    }
  };

  const changePriority = async (task, prioritaet) => {
    try { await base44.entities.Aufgabe.update(task.id, { prioritaet }); loadData(); }
    catch (e) { toast.error('Fehler'); }
  };

  const togglePin = async (task) => {
    try {
      await base44.entities.Aufgabe.update(task.id, { heute_fokussiert: !task.heute_fokussiert });
      loadData();
    } catch (e) { toast.error('Fehler'); }
  };

  useEffect(() => () => Object.values(timers.current).forEach(clearTimeout), []);

  const open = aufgaben.filter((t) => !t.erledigt);
  let filtered = filterByDelegation(open, delegationFilter, user);
  const groups = groupAufgaben(filtered);

  const meinTag = open.filter((t) => t.heute_fokussiert);

  return (
    <div className="p-4 md:p-8 max-w-[1150px] mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <h1 className="text-2xl md:text-3xl font-bold">Aufgaben</h1>
        <button
          onClick={() => {
            const next = !showErledigt;
            setShowErledigt(next);
            if (next && erledigte.length === 0) loadErledigte();
          }}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground px-3 py-2 rounded-lg hover:bg-cardbg min-h-[40px] transition-colors"
        >
          {showErledigt ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          {showErledigt ? 'Erledigt verbergen' : 'Erledigt zeigen'}
        </button>
      </div>

      <div className="flex gap-2">
        {[{ value: 'all', label: 'Alle' }, { value: 'mine', label: 'Meine' }, { value: 'byme', label: 'Von mir' }].map((chip) => (
          <button
            key={chip.value}
            onClick={() => setDelegationFilter(chip.value)}
            className={cn(
              'px-4 py-2 rounded-full text-sm font-medium min-h-[40px] transition-colors',
              delegationFilter === chip.value ? 'bg-brand text-white' : 'bg-cardbg text-muted-foreground hover:text-foreground'
            )}
          >
            {chip.label}
          </button>
        ))}
      </div>

      {showQuickAdd ? (
        <Card className="p-4 shadow-sm space-y-3">
          <Input
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && quickAdd()}
            placeholder="Aufgabentitel..."
            className="min-h-[48px] text-base"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-2">
            <Select value={newPrio} onValueChange={setNewPrio}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="A">A – Heute</SelectItem>
                <SelectItem value="B">B – Woche</SelectItem>
                <SelectItem value="C">C – Wenn Zeit</SelectItem>
              </SelectContent>
            </Select>
            <Select value={newProjekt} onValueChange={setNewProjekt}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt (optional)" /></SelectTrigger>
              <SelectContent>
                <SelectItem value={null}>Kein Projekt</SelectItem>
                {projekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowQuickAdd(false)} variant="outline" className="min-h-[48px] flex-1">Abbrechen</Button>
            <Button onClick={quickAdd} disabled={!newTitle.trim()} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">Speichern</Button>
          </div>
        </Card>
      ) : (
        <button
          onClick={() => setShowQuickAdd(true)}
          className="w-full flex items-center gap-2 p-4 border-2 border-dashed border-border rounded-2xl text-muted-foreground hover:border-brand hover:text-brand transition-colors min-h-[48px]"
        >
          <Plus className="w-5 h-5" /> Aufgabe hinzufügen
        </button>
      )}

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Lade Aufgaben...</p>
      ) : (
        <>
          <MeinTagBlock
            tasks={meinTag}
            projName={projName}
            onToggle={toggleErledigt}
            onPin={togglePin}
            fadingIds={fadingIds}
          />

          <Card className="p-3 md:p-4 shadow-sm space-y-1">
            {BUCKETS.map((b) => (
              <AufgabeGruppe
                key={b.key}
                label={b.label}
                tone={b.tone}
                tasks={groups[b.key]}
                defaultOpen={DEFAULT_OPEN[b.key]}
                projName={projName}
                onToggle={toggleErledigt}
                onPrioChange={changePriority}
                onPin={togglePin}
                fadingIds={fadingIds}
              />
            ))}
            {filtered.length === 0 && (
              <p className="text-muted-foreground text-center py-6">Keine offenen Aufgaben.</p>
            )}
          </Card>

          {showErledigt && (
            <Card className="p-3 md:p-4 shadow-sm">
              <h2 className="font-semibold text-muted-foreground px-2 py-2">Erledigt · {erledigte.length}</h2>
              <div className="space-y-0.5 opacity-60">
                {erledigte.length === 0 ? (
                  <p className="text-muted-foreground text-sm py-4 text-center">Keine erledigten Aufgaben.</p>
                ) : erledigte.map((t) => (
                  <AufgabeRow
                    key={t.id}
                    task={t}
                    projName={projName}
                    onToggle={toggleErledigt}
                    onPrioChange={changePriority}
                    onPin={togglePin}
                    showPin={false}
                  />
                ))}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}