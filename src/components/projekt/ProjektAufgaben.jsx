import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { todayISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function ProjektAufgaben({ projekt }) {
  const [aufgaben, setAufgaben] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [newPrio, setNewPrio] = useState('B');

  useEffect(() => {
    loadAufgaben();
  }, [projekt.id]);

  const loadAufgaben = async () => {
    try {
      const data = await base44.entities.Aufgabe.filter({ projekt_id: projekt.id }, '-created_date', 100);
      setAufgaben(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async () => {
    if (!newTitle.trim()) return;
    try {
      await base44.entities.Aufgabe.create({
        titel: newTitle,
        projekt_id: projekt.id,
        prioritaet: newPrio,
        faellig_am: todayISO(),
      });
      setNewTitle('');
      loadAufgaben();
    } catch (e) {
      toast.error('Fehler');
    }
  };

  const toggleErledigt = async (task) => {
    await base44.entities.Aufgabe.update(task.id, {
      erledigt: !task.erledigt,
      erledigt_am: !task.erledigt ? new Date().toISOString() : null,
    });
    loadAufgaben();
  };

  const handleDelete = async (id) => {
    await base44.entities.Aufgabe.delete(id);
    loadAufgaben();
  };

  const prioColors = {
    A: 'text-accent border-accent',
    B: 'text-brand border-brand',
    C: 'text-muted-foreground border-border',
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          placeholder="Neue Aufgabe..."
          className="min-h-[48px] flex-1"
        />
        <Select value={newPrio} onValueChange={setNewPrio}>
          <SelectTrigger className="w-20 min-h-[48px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="A">A</SelectItem>
            <SelectItem value="B">B</SelectItem>
            <SelectItem value="C">C</SelectItem>
          </SelectContent>
        </Select>
        <Button onClick={handleAdd} className="bg-brand hover:bg-brand-dark text-white min-h-[48px]">
          <Plus className="w-4 h-4" />
        </Button>
      </div>

      {loading ? (
        <p className="text-muted-foreground">Lade...</p>
      ) : (
        <div className="space-y-2">
          {aufgaben.map((task) => (
            <div
              key={task.id}
              className={cn(
                'flex items-center gap-3 p-3 bg-cardbg rounded-xl min-h-[48px]',
                task.erledigt && 'opacity-50'
              )}
            >
              <button
                onClick={() => toggleErledigt(task)}
                className={cn(
                  'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0',
                  task.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : prioColors[task.prioritaet]
                )}
              >
                {task.erledigt && <Check className="w-4 h-4 text-white" />}
              </button>
              <div className="flex-1 min-w-0">
                <p className={cn('font-medium', task.erledigt && 'line-through')}>{task.titel}</p>
                {task.faellig_am && (
                  <p className="text-xs text-muted-foreground">{formatDate(task.faellig_am)}</p>
                )}
              </div>
              <span className={cn('text-xs font-bold px-2 py-1 rounded-full border', prioColors[task.prioritaet])}>
                {task.prioritaet}
              </span>
              <button
                onClick={() => handleDelete(task.id)}
                className="text-muted-foreground hover:text-destructive p-1 shrink-0"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
          {aufgaben.length === 0 && (
            <p className="text-muted-foreground text-sm text-center py-4">Keine Aufgaben für dieses Projekt.</p>
          )}
        </div>
      )}
    </div>
  );
}