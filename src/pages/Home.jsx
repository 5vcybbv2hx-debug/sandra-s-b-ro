import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, CheckCircle2, Clock, ArrowRight } from 'lucide-react';
import { todayISO, daysAgoISO, formatDate } from '@/lib/format';
import { toast } from 'sonner';
import FokusHeuteCard from '@/components/FokusHeuteCard';

export default function Home() {
  const { user } = useAuth();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const since = daysAgoISO(7);
      const [aufgaben, zeiteintraege, projekte] = await Promise.all([
        base44.entities.Aufgabe.filter({ erledigt: false }),
        base44.entities.Zeiteintrag.filter({ datum: { $gte: since } }, '-datum', 200).catch(() => []),
        base44.entities.Projekt.list('-updated_date', 200),
      ]);

      const myTasks = aufgaben
        .filter(t => t.heute_fokussiert || t.zugewiesen_an_email === user?.email)
        .sort((a, b) => {
          if (a.heute_fokussiert && !b.heute_fokussiert) return -1;
          if (!a.heute_fokussiert && b.heute_fokussiert) return 1;
          const prio = { A: 0, B: 1, C: 2 };
          return (prio[a.prioritaet] ?? 1) - (prio[b.prioritaet] ?? 1);
        })
        .slice(0, 8);

      const offeneZeiten = zeiteintraege
        .filter(z => !z.ist_abgerechnet && !z.timer_laeuft)
        .sort((a, b) => (b.datum || '').localeCompare(a.datum || ''))
        .slice(0, 10);

      const projName = (pid) => projekte.find(p => p.id === pid)?.projekt_name || '—';

      setD({ myTasks, offeneZeiten, projName });
    } catch (e) {
      console.error(e);
      toast.error('Dashboard konnte nicht geladen werden');
    } finally { setLoading(false); }
  };

  const toggleTask = async (t) => {
    await base44.entities.Aufgabe.update(t.id, { erledigt: true, erledigt_am: todayISO(), heute_fokussiert: false });
    loadData();
  };

  const quickAdd = async () => {
    if (!newTask.trim()) return;
    await base44.entities.Aufgabe.create({ titel: newTask, prioritaet: 'B', heute_fokussiert: true, erledigt: false });
    setNewTask('');
    loadData();
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade...</div>;

  return (
    <div className="p-4 md:p-8 max-w-[1150px] mx-auto space-y-5">
      <h1 className="text-xl md:text-2xl font-bold">{greeting}, Sandra</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: Meine Aufgaben + Fokus */}
        <div className="space-y-5">
          <Card className="p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-3">
              <CheckCircle2 className="w-5 h-5 text-brand" />
              <h2 className="font-semibold">Meine Aufgaben heute</h2>
            </div>
            {d.myTasks.length === 0 ? (
              <p className="text-center py-4 text-muted-foreground text-sm">Nichts offen — schöner Tag</p>
            ) : (
              <div className="space-y-1">
                {d.myTasks.map(t => (
                  <div key={t.id} className="flex items-center gap-3 py-2 min-h-[48px]">
                    <button onClick={() => toggleTask(t)} className="w-6 h-6 rounded-full border-2 border-brand shrink-0 hover:bg-brand-light transition-colors" aria-label="Erledigen" />
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{t.titel}</p>
                      {t.zugewiesen_von_name && <p className="text-xs text-muted-foreground">von {t.zugewiesen_von_name}</p>}
                    </div>
                    {t.prioritaet === 'A' && <span className="text-xs font-bold text-accent shrink-0">A</span>}
                    {t.faellig_am && <span className="text-xs text-muted-foreground shrink-0">{formatDate(t.faellig_am)}</span>}
                  </div>
                ))}
              </div>
            )}
            <div className="mt-3 flex gap-2">
              <Input
                value={newTask}
                onChange={e => setNewTask(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && quickAdd()}
                placeholder="Aufgabe hinzufügen..."
                className="min-h-[44px]"
              />
              <Button onClick={quickAdd} size="icon" className="min-h-[44px] min-w-[44px] bg-brand hover:bg-brand-dark shrink-0">
                <Plus className="w-5 h-5" />
              </Button>
            </div>
          </Card>

          <FokusHeuteCard />
        </div>

        {/* Right: Offene Zeiten */}
        <div>
          <Card className="p-5 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-brand" />
                <h2 className="font-semibold">Offene Zeiten</h2>
              </div>
              <Link to="/zeiten" className="text-sm text-accent hover:underline flex items-center gap-1">
                Alle <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
            <p className="text-xs text-muted-foreground mb-3">Nicht abgerechnete Einträge der letzten 7 Tage</p>
            {d.offeneZeiten.length === 0 ? (
              <p className="text-center py-6 text-muted-foreground text-sm">Alles erfasst</p>
            ) : (
              <div className="space-y-1">
                {d.offeneZeiten.map(z => (
                  <Link key={z.id} to="/zeiten" className="flex items-center gap-3 py-2.5 min-h-[44px] border-b border-border/40 last:border-0 hover:bg-cardbg rounded-lg px-2 -mx-2 transition-colors">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate text-sm">{d.projName(z.projekt_id)}</p>
                      <p className="text-xs text-muted-foreground">{formatDate(z.datum)}{z.beschreibung && ` · ${z.beschreibung}`}</p>
                    </div>
                    <span className="font-bold text-brand-dark shrink-0">{z.stunden} h</span>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}