import { useTimer } from '@/lib/TimerContext';
import { formatDuration } from '@/lib/format';

export default function TimerBanner() {
  const { activeTimer, elapsed, project, stopTimer } = useTimer();
  if (!activeTimer) return null;
  return (
    <div className="bg-brand text-white px-4 py-2.5 flex items-center justify-between">
      <div className="min-w-0">
        <p className="text-xs text-white/80">Laufender Timer</p>
        <p className="font-semibold truncate">{project?.projekt_name || 'Projekt'}{activeTimer.beschreibung && ` · ${activeTimer.beschreibung}`}</p>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-lg font-bold tabular-nums">{formatDuration(elapsed)}</span>
        <button onClick={stopTimer} className="bg-white text-brand rounded-full px-4 py-1.5 text-sm font-semibold min-h-[36px] hover:bg-white/90">Stop</button>
      </div>
    </div>
  );
}