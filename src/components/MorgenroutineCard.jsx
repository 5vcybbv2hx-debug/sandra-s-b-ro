import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sunrise, ChevronDown, ChevronUp, Check } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { cn } from '@/lib/utils';

const STORAGE_KEY = 'sandra_morgenroutine';
const todayKey = () => new Date().toISOString().split('T')[0];

export default function MorgenroutineCard() {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState([]);
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);
  const [doneToday, setDoneToday] = useState(false);

  useEffect(() => {
    setDoneToday(localStorage.getItem(STORAGE_KEY) === todayKey());
  }, []);

  const loadTasks = async () => {
    setLoading(true);
    try {
      const t = await base44.entities.Aufgabe.filter({ erledigt: false, prioritaet: 'A' });
      setTasks(t);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const toggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && tasks.length === 0 && !loading) loadTasks();
  };

  const toggleTask = (id) => {
    setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : prev.length < 3 ? [...prev, id] : prev);
  };

  const finish = async () => {
    try {
      if (selected.length > 0) {
        await base44.entities.Aufgabe.bulkUpdate(selected.map(id => ({ id, heute_fokussiert: true })));
      }
    } catch (e) { console.error(e); }
    localStorage.setItem(STORAGE_KEY, todayKey());
    setDoneToday(true);
    setExpanded(false);
    setSelected([]);
  };

  return (
    <Card className="shadow-sm">
      <button
        onClick={toggle}
        className="w-full flex items-center justify-between p-4 min-h-[48px]"
      >
        <div className="flex items-center gap-2">
          <Sunrise className={cn('w-5 h-5', doneToday ? 'text-muted-foreground' : 'text-brand')} />
          <span className="font-medium text-sm">Morgenroutine</span>
          {!doneToday && <span className="w-2 h-2 rounded-full bg-brand" />}
        </div>
        {expanded
          ? <ChevronUp className="w-4 h-4 text-muted-foreground" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
      </button>

      {expanded && (
        <div className="px-4 pb-4 space-y-2">
          {loading ? (
            <p className="text-center py-3 text-muted-foreground text-sm">Lade...</p>
          ) : tasks.length === 0 ? (
            <p className="text-center py-3 text-muted-foreground text-sm">Keine A-Aufgaben offen. 🎉</p>
          ) : (
            <>
              <p className="text-xs text-muted-foreground mb-1">
                Wähle max. 3 für heute ({selected.length}/3)
              </p>
              {tasks.map(task => (
                <button
                  key={task.id}
                  onClick={() => toggleTask(task.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl border-2 transition-colors min-h-[48px]',
                    selected.includes(task.id)
                      ? 'border-brand bg-brand-light'
                      : 'border-border hover:border-brand/50'
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      'w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0',
                      selected.includes(task.id) ? 'bg-brand border-brand' : 'border-border'
                    )}>
                      {selected.includes(task.id) && <Check className="w-3 h-3 text-white" />}
                    </div>
                    <span className="font-medium text-sm">{task.titel}</span>
                  </div>
                </button>
              ))}
              <Button
                onClick={finish}
                className="w-full bg-brand hover:bg-brand-dark text-white min-h-[44px] mt-2"
              >
                {selected.length > 0 ? `${selected.length} fokussieren & fertig` : 'Fertig'}
              </Button>
            </>
          )}
        </div>
      )}
    </Card>
  );
}