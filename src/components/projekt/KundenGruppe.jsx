import { ChevronDown, ChevronRight } from 'lucide-react';
import ProjektRow from './ProjektRow';
import { cn } from '@/lib/utils';

export default function KundenGruppe({ groupName, projekte, activeCount, dimmed, expanded, onToggle }) {
  return (
    <div className={cn('border border-border rounded-2xl overflow-hidden bg-white transition-opacity', dimmed && 'opacity-60')}>
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between gap-3 py-4 px-4 hover:bg-muted/30 transition-colors min-h-[52px]"
      >
        <div className="flex items-center gap-2 min-w-0">
          {expanded
            ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
            : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
          <p className={cn('font-semibold truncate', dimmed && 'text-muted-foreground')}>{groupName}</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeCount > 0 && (
            <span className="text-xs bg-brand-light text-brand-dark px-2 py-0.5 rounded-full">{activeCount} aktiv</span>
          )}
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">{projekte.length}</span>
        </div>
      </button>
      {expanded && (
        <div className="px-2 pb-2 divide-y divide-border/40">
          {projekte.map((p) => <ProjektRow key={p.id} projekt={p} />)}
        </div>
      )}
    </div>
  );
}