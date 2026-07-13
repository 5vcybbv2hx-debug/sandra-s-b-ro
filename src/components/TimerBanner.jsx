import { Square } from 'lucide-react';
import { useTimer } from '@/lib/TimerContext';
import { formatDuration } from '@/lib/format';

export default function TimerBanner() {
  const { activeTimer, elapsed, project, stopTimer } = useTimer();
  if (!activeTimer) return null;

  return (
    <div className="bg-brand text-white px-4 py-2.5 flex items-center justify-between sticky top-0 z-30">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="animate-pulse text-lg">⏱</span>
        <div className="min-w-0">
          <p className="text-sm font-medium leading-tight truncate">{project?.projekt_name || 'Projekt'}</p>
          {activeTimer.beschreibung && (
            <p className="text-xs text-white/70 truncate">{activeTimer.beschreibung}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono text-base md:text-lg font-semibold tabular-nums">{formatDuration(elapsed)}</span>
        <button
          onClick={stopTimer}
          className="bg-white text-brand rounded-full px-3 md:px-4 py-1.5 md:py-2 text-sm font-semibold flex items-center gap-1.5 min-h-[40px] hover:bg-white/90 transition-colors"
        >
          <Square className="w-3.5 h-3.5 fill-current" /> Stop
        </button>
      </div>
    </div>
  );
}