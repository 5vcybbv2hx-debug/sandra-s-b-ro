import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useTimer } from '@/lib/TimerContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Play, Square, Plus, Phone, CheckCircle2, Car } from 'lucide-react';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import MorgenroutineCard from '@/components/MorgenroutineCard';

function fmtElapsed(sec) {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

export default function Home() {
  const { activeTimer, elapsed, project: timerProject, startTimer, stopTimer } = useTimer();
  const [d, setD] = useState(null);
  const [loading, setLoading] = useState(true);
  const [newTask, setNewTask] = useState('');

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [aufgaben, notizen, projekte, firmen, fahrten] = await Promise.all([
        base44.entities.Aufgabe.filter({ erledigt: false }),
        base44.entities.Telefonnotiz.filter({ erledigt: false }),
        base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 10),
        base44.entities.Firma.list('-name', 200),
        base44.entities.Fahrt.filter({ datum: todayISO() }, '-created_date', 10),
      ]);
      const focused = aufgaben.filter(t => t.heute_fokussiert);
      const unfocused = aufgaben.filter(t => !t.heute_fokussiert);
      const topTasks = [...focused, ...unfocused].slice(0, 3);
      const callbacks = notizen.filter(n => n.naechster_schritt).slice(0, 3);
      const todayFahrten = fahrten || [];
      setD({ topTasks, callbacks, projects: projekte.slice(0, 5), firmen, todayFahrten });
    } catch (e) {
      console.error(e);
      toast.error('Dashboard konnte nicht geladen werden');
    } finally { setLoading(false); }
  };

  const toggleTask = async (t) => {
    await base44.entities.Aufgabe.update(t.id, { erledigt: true, erledigt_am: todayISO(), heute_fokussiert: false });
    loadData();
  };
  const toggleCallback = async (n) => {
    await base44.entities.Telefonnotiz.update(n.id, { erledigt: true });
    loadData();
  };
  const quickAdd = async () => {
    if (!newTask.trim()) return;
    await base44.entities.Aufgabe.create({ titel: newTask, prioritaet: 'B', heute_fokussiert: true, erledigt: false });
    setNewTask('');
    loadData();
  };

  const firmaName = (fid) => d?.firmen.find(f => f.id === fid)?.name || '';

  const handleStartTimer = async (proj) => {
    await startTimer(proj.id, '', '');
    toast.success(`Timer gestartet für ${proj.projekt_name}`);
  };

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Guten Morgen' : hour < 18 ? 'Guten Tag' : 'Guten Abend';

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Dashboard...</div>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-xl md:text-2xl font-bold">{greeting}, Sandra</h1>
      </div>

      {/* 1. Aktiver Timer */}
      {activeTimer && (
        <Card className="p-5 bg-brand text-white shadow-lg border-0">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-white/70 uppercase tracking-wide">Timer läuft</p>
              <p className="font-semibold text-lg truncate">{timerProject?.projekt_name || 'Projekt'}</p>
              <p className="text-3xl font-bold font-mono tabular-nums mt-1">{fmtElapsed(elapsed)}</p>
            </div>
            <Button size="lg" onClick={stopTimer} className="min-h-[56px] min-w-[56px] shrink-0 bg-white text-brand hover:bg-white/90 border-0">
              <Square className="w-6 h-6 fill-current" />
            </Button>
          </div>
        </Card>
      )}

      {/* 2. Projekte mit Timer-Start */}
      <div>
        <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Projekte</h2>
        <div className="space-y-2">
          {d.projects.map(p => (
            <Card key={p.id} className="p-0 shadow-sm overflow-hidden">
              <div className="flex items-center gap-1">
                <Link to={`/projekte/${p.id}`} className="flex-1 min-w-0 p-4">
                  <p className="font-semibold truncate">{p.projekt_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{firmaName(p.firma_id)}</p>
                </Link>
                <button
                  onClick={() => handleStartTimer(p)}
                  disabled={!!activeTimer}
                  className="shrink-0 w-12 h-12 m-2 rounded-xl bg-brand-light text-brand-dark hover:bg-brand hover:text-white disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center transition-colors"
                  aria-label={`Timer starten für ${p.projekt_name}`}
                >
                  <Play className="w-5 h-5 fill-current" />
                </button>
              </div>
            </Card>
          ))}
          {d.projects.length === 0 && (
            <p className="text-center py-4 text-muted-foreground text-sm">Keine aktiven Projekte</p>
          )}
        </div>
      </div>

      {/* 2.5 Heutige Fahrten */}
      {d.todayFahrten.length > 0 && (
        <Card className="p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3">
            <Car className="w-5 h-5 text-brand" />
            <h2 className="font-semibold">Heutige Fahrten ({d.todayFahrten.length})</h2>
          </div>
          <div className="space-y-1">
            {d.todayFahrten.map(f => (
              <div key={f.id} className="flex items-center gap-3 py-2 min-h-[40px] text-sm">
                <span className="text-muted-foreground font-mono text-xs">{f.kilometer || '?'} km</span>
                <span className="font-medium flex-1 min-w-0 truncate">{f.startort || f.ziel || 'Fahrt'}</span>
                {f.ziel && f.startort && <span className="text-muted-foreground truncate">→ {f.ziel}</span>}
              </div>
            ))}
            <Link to="/fahrten" className="block text-center text-sm text-brand hover:underline pt-2">Alle Fahrten</Link>
          </div>
        </Card>
      )}

      {/* 3. Heute im Fokus */}
      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="w-5 h-5 text-brand" />
          <h2 className="font-semibold">Heute im Fokus</h2>
        </div>
        {d.topTasks.length === 0 ? (
          <p className="text-center py-3 text-muted-foreground text-sm">Nichts geplant — relax 🌿</p>
        ) : (
          <div className="space-y-1">
            {d.topTasks.map(t => (
              <div key={t.id} className="flex items-center gap-3 py-2 min-h-[48px]">
                <button
                  onClick={() => toggleTask(t)}
                  className="w-6 h-6 rounded-full border-2 border-brand shrink-0 hover:bg-brand-light transition-colors"
                  aria-label="Erledigen"
                />
                <span className="font-medium flex-1 min-w-0 truncate">{t.titel}</span>
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

      {/* 4. Offene Rückrufe */}
      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-5 h-5 text-accent" />
          <h2 className="font-semibold">Offene Rückrufe</h2>
        </div>
        {d.callbacks.length === 0 ? (
          <p className="text-center py-3 text-muted-foreground text-sm">Keine offenen Rückrufe ✓</p>
        ) : (
          <div className="space-y-1">
            {d.callbacks.map(n => (
              <div key={n.id} className="flex items-center gap-3 py-2 min-h-[48px]">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{n.kontakt_name}</p>
                  <p className="text-sm text-muted-foreground truncate">{n.naechster_schritt}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => toggleCallback(n)}
                  className="min-h-[36px] shrink-0 text-status-abgeschlossen border-status-abgeschlossen/30 hover:bg-status-abgeschlossen/10"
                >
                  Erledigt
                </Button>
              </div>
            ))}
            <Link to="/telefon" className="block text-center text-sm text-brand hover:underline pt-2">
              Alle anzeigen
            </Link>
          </div>
        )}
      </Card>

      {/* Morgenroutine — einklappbare Card */}
      <MorgenroutineCard />
    </div>
  );
}