import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check } from 'lucide-react';
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
  const [newTitle, setNewTitle] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user?.role === 'admin') return;
    loadAufgaben();
  }, [user]);

  if (user?.role === 'admin') {
    return <Navigate to="/projekte" replace />;
  }

  const loadAufgaben = async () => {
    try {
      const data = await base44.entities.Aufgabe.list('-created_date', 200);
      setAufgaben(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const quickAdd = async (e) => {
    if (e.key === 'Enter' && newTitle.trim()) {
      try {
        await base44.entities.Aufgabe.create({
          titel: newTitle,
          prioritaet: 'B',
          faellig_am: todayISO(),
        });
        setNewTitle('');
        loadAufgaben();
      } catch (err) {
        toast.error('Fehler');
      }
    }
  };

  const toggleErledigt = async (task) => {
    await base44.entities.Aufgabe.update(task.id, {
      erledigt: !task.erledigt,
      erledigt_am: !task.erledigt ? new Date().toISOString() : null,
      heute_fokussiert: false,
    });
    loadAufgaben();
  };

  const changePriority = async (task, prioritaet) => {
    await base44.entities.Aufgabe.update(task.id, { prioritaet });
    loadAufgaben();
  };

  const handleDelete = async (id) => {
    await base44.entities.Aufgabe.delete(id);
    loadAufgaben();
  };

  const now = Date.now();
  const visible = aufgaben.filter(
    (t) => !t.erledigt || (t.erledigt_am && now - new Date(t.erledigt_am).getTime() < 86400000)
  );

  const groupA = visible.filter((t) => t.prioritaet === 'A' && !t.erledigt);
  const groupB = visible.filter((t) => t.prioritaet === 'B' && !t.erledigt);
  const groupC = visible.filter((t) => t.prioritaet === 'C' && !t.erledigt);
  const erledigte = visible.filter((t) => t.erledigt);

  const renderGroup = (tasks, prio) => {
    const config = prioConfig[prio];
    return (
      <Card className="p-4 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <span className={cn('text-xs font-bold px-2 py-0.5 rounded-full border', config.border, config.color)}>
            {prio}
          </span>
          <h2 className={cn('font-semibold', config.color)}>{config.label}</h2>
          <span className="text-sm text-muted-foreground">({tasks.length})</span>
        </div>
        <div className="space-y-1">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="flex items-center gap-3 p-2 rounded-xl hover:bg-cardbg min-h-[48px]"
            >
              <button
                onClick={() => toggleErledigt(task)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                  task.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : config.border
                )}
              >
                {task.erledigt && <Check className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium truncate', task.erledigt && 'line-through')}>{task.titel}</p>
                {task.faellig_am && (
                  <p className="text-xs text-muted-foreground">Fällig: {formatDate(task.faellig_am)}</p>
                )}
              </div>
              <Select
                value={task.prioritaet}
                onValueChange={(v) => changePriority(task, v)}
              >
                <SelectTrigger className="w-16 h-8 min-h-[32px] text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="A">A</SelectItem>
                  <SelectItem value="B">B</SelectItem>
                  <SelectItem value="C">C</SelectItem>
                </SelectContent>
              </Select>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-muted-foreground hover:text-destructive p-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="text-muted-foreground text-sm py-2">Keine Aufgaben.</p>
          )}
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <h1 className="text-2xl md:text-3xl font-bold">Aufgaben</h1>

      <div className="relative">
        <Plus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={quickAdd}
          placeholder="Aufgabe hinzufügen — Enter zum Speichern"
          className="pl-10 min-h-[52px] text-base"
        />
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Lade Aufgaben...</p>
      ) : (
        <div className="space-y-4">
          {renderGroup(groupA, 'A')}
          {renderGroup(groupB, 'B')}
          {renderGroup(groupC, 'C')}
          {erledigte.length > 0 && (
            <Card className="p-4 shadow-sm opacity-60">
              <h2 className="font-semibold text-muted-foreground mb-3">Erledigt ({erledigte.length})</h2>
              <div className="space-y-1">
                {erledigte.map((task) => (
                  <div key={task.id} className="flex items-center gap-3 p-2 min-h-[48px]">
                    <button
                      onClick={() => toggleErledigt(task)}
                      className="w-6 h-6 rounded-full border-2 bg-status-abgeschlossen border-status-abgeschlossen flex items-center justify-center shrink-0"
                    >
                      <Check className="w-4 h-4 text-white" />
                    </button>
                    <p className="flex-1 font-medium line-through text-muted-foreground">{task.titel}</p>
                    <button
                      onClick={() => handleDelete(task.id)}
                      className="text-muted-foreground hover:text-destructive p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      )}
    </div>
  );
}