import { useState } from 'react';
import { useTimer } from '@/lib/TimerContext';
import { Play, Square, Loader2, Timer } from 'lucide-react';
import ProjektSelect from '@/components/ProjektSelect';
import { toast } from 'sonner';

export default function TimerBar() {
  const { activeTimer, elapsed, project, startTimer, stopTimer, loading } = useTimer();
  const [selectedProjekt, setSelectedProjekt] = useState('');
  const [starting, setStarting] = useState(false);
  const [stopping, setStopping] = useState(false);

  const handleStart = async () => {
    if (!selectedProjekt) return;
    setStarting(true);
    try {
      await startTimer(selectedProjekt, '', '');
      setSelectedProjekt('');
      toast.success('Timer gestartet');
    } catch (e) {
      toast.error('Timer konnte nicht gestartet werden');
    } finally {
      setStarting(false);
    }
  };

  const handleStop = async () => {
    setStopping(true);
    try {
      await stopTimer();
      toast.success('Zeit gespeichert');
    } catch (e) {
      toast.error('Fehler beim Stoppen');
    } finally {
      setStopping(false);
    }
  };

  if (loading) return null;

  return (
    <div className="sticky top-0 z-20 bg-white border-b border-border shadow-sm">
      <div className="px-4 md:px-6 py-2 flex items-center gap-2 max-w-[1150px] mx-auto">
        {activeTimer ? (
          <>
            <span className="w-2 h-2 rounded-full bg-brand animate-pulse shrink-0" />
            <span className="font-medium truncate text-sm flex-1 min-w-0">
              {project?.projekt_name || 'Projekt'}
              {activeTimer.beschreibung && <span className="text-muted-foreground"> · {activeTimer.beschreibung}</span>}
            </span>
            <span className="font-mono font-bold tabular-nums text-sm md:text-base shrink-0">
              {String(Math.floor(elapsed / 3600)).padStart(2, '0')}:{String(Math.floor((elapsed % 3600) / 60)).padStart(2, '0')}:{String(elapsed % 60).padStart(2, '0')}
            </span>
            <button
              onClick={handleStop}
              disabled={stopping}
              className="shrink-0 bg-brand text-white rounded-lg px-3 py-1.5 text-sm font-semibold min-h-[36px] hover:bg-brand-dark disabled:opacity-50 flex items-center gap-1.5"
            >
              {stopping ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Square className="w-3.5 h-3.5 fill-current" />}
              Stop
            </button>
          </>
        ) : (
          <>
            <Timer className="w-4 h-4 text-muted-foreground shrink-0 hidden sm:block" />
            <ProjektSelect
              value={selectedProjekt}
              onValueChange={setSelectedProjekt}
              placeholder="Projekt wählen..."
              filter={{ status: 'Aktiv' }}
              className="flex-1 max-w-md min-h-[36px]"
            />
            <button
              onClick={handleStart}
              disabled={!selectedProjekt || starting}
              className="shrink-0 bg-brand text-white rounded-lg px-4 py-1.5 text-sm font-semibold min-h-[36px] hover:bg-brand-dark disabled:opacity-50 flex items-center gap-1.5"
            >
              {starting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 fill-current" />}
              Start
            </button>
          </>
        )}
      </div>
    </div>
  );
}