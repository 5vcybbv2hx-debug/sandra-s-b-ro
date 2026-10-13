import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTimer } from '@/lib/TimerContext';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Play, Pin, PinOff, AlertCircle, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

function diffDays(a, b) { return Math.round((new Date(b) - new Date(a)) / 86400000); }
function todayISO() { return new Date().toISOString().split('T')[0]; }
function plural(n, s) { return `${n} ${s}${n === 1 ? '' : 'en'}`; }

export default function FokusHeuteCard() {
  const { activeTimer, startTimer } = useTimer();
  const [projects, setProjects] = useState([]);
  const [phases, setPhases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [snoozed, setSnoozed] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [projekte, phasen] = await Promise.all([
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-deadline', 50),
        base44.entities.Projektphase.list('-created_date', 500),
      ]);
      setProjects(projekte);
      setPhases(phasen);
      const today = todayISO();
      const s = {};
      for (const p of projekte) {
        const d = localStorage.getItem(`fokus_snooze_${p.id}`);
        if (d && d > today) s[p.id] = d;
      }
      setSnoozed(s);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const today = new Date(); today.setHours(0, 0, 0, 0);

  const scored = projects
    .filter(p => !snoozed[p.id])
    .map(p => {
      let score = 0, reason = '', urgency = 'normal';
      if (p.pinned) {
        score = 10000 + (p.pinned_order || 0);
        reason = 'Von dir priorisiert';
        urgency = 'pinned';
      } else if (p.deadline) {
        const days = diffDays(today, new Date(p.deadline));
        if (days < 0) { score = 5000 - Math.abs(days); reason = `Überfällig seit ${plural(Math.abs(days), 'Tag')}`; urgency = 'overdue'; }
        else if (days <= 14) { score = 3000 - days; reason = `Deadline in ${plural(days, 'Tag')}`; urgency = 'soon'; }
        else { score = 1000 - days; reason = `Deadline in ${plural(days, 'Tag')}`; }
      } else {
        const projectPhases = phases.filter(ph => ph.projekt_id === p.id && ph.enddatum_geplant);
        const overdue = projectPhases.map(ph => ({ days: diffDays(new Date(ph.enddatum_geplant), today) })).filter(x => x.days > 0).sort((a, b) => b.days - a.days)[0];
        if (overdue) { score = 2000 - overdue.days; reason = `Phase überfällig seit ${plural(overdue.days, 'Tag')}`; urgency = 'overdue'; }
        else {
          const remaining = (p.geschaetzte_stunden_gesamt || 0) - (p.abgerechnete_stunden || 0);
          if (remaining > 0) { score = 500 + remaining; reason = `Noch ${remaining} h offen`; }
          else { score = 100; reason = 'Aktiv'; }
        }
      }
      return { ...p, _score: score, _reason: reason, _urgency: urgency };
    })
    .sort((a, b) => b._score - a._score);

  const suggestions = scored.slice(0, 3);
  const missingDeadlineId = suggestions.find(p => !p.deadline && p._urgency !== 'pinned')?.id;

  const handleSnooze = (p) => {
    const t = new Date(); t.setDate(t.getDate() + 1);
    const iso = t.toISOString().split('T')[0];
    localStorage.setItem(`fokus_snooze_${p.id}`, iso);
    setSnoozed(prev => ({ ...prev, [p.id]: iso }));
    toast.success(`${p.projekt_name} bis morgen ausgeblendet`);
  };

  const handlePin = async (p) => {
    const np = !p.pinned;
    await base44.entities.Projekt.update(p.id, { pinned: np, pinned_order: np ? Date.now() : 0 });
    loadData();
  };

  const handleStartTimer = async (p) => {
    await startTimer(p.id, '', '');
    toast.success(`Timer gestartet für ${p.projekt_name}`);
  };

  if (loading || suggestions.length === 0) return null;

  return (
    <Card className="p-5 shadow-sm border-brand/20">
      <div className="flex items-center gap-2 mb-3">
        <Sparkles className="w-5 h-5 text-brand" />
        <h2 className="font-semibold">Fokus heute</h2>
      </div>
      <div className="space-y-2">
        {suggestions.map(p => (
          <div key={p.id} className={cn(
            'rounded-lg border p-3 transition-colors',
            p._urgency === 'pinned' ? 'border-brand/30 bg-brand-light/20' :
            p._urgency === 'overdue' ? 'border-accent/30 bg-accent-light/20' :
            'border-border'
          )}>
            <Link to={`/projekte/${p.id}`} className="font-medium hover:underline truncate block">
              {p.projekt_name}
            </Link>
            <p className="text-sm text-muted-foreground mt-0.5">{p._reason}</p>
            <div className="flex items-center gap-2 mt-2">
              <Button size="sm" onClick={() => handleStartTimer(p)} disabled={!!activeTimer} className="min-h-[36px] bg-brand hover:bg-brand-dark text-white">
                <Play className="w-4 h-4 fill-current" /> Timer
              </Button>
              <button onClick={() => handlePin(p)} className="shrink-0 w-9 h-9 rounded-lg text-muted-foreground hover:text-brand hover:bg-brand-light/50 flex items-center justify-center transition-colors" aria-label={p.pinned ? 'Lösen' : 'Anheften'}>
                {p.pinned ? <PinOff className="w-4 h-4" /> : <Pin className="w-4 h-4" />}
              </button>
              <button onClick={() => handleSnooze(p)} className="shrink-0 px-3 h-9 rounded-lg text-xs text-muted-foreground hover:bg-muted transition-colors">
                Nicht jetzt
              </button>
            </div>
            {!p.deadline && p.id === missingDeadlineId && (
              <div className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                <Link to={`/projekte/${p.id}`} className="hover:underline">Deadline fehlt — setzen?</Link>
              </div>
            )}
          </div>
        ))}
      </div>
    </Card>
  );
}