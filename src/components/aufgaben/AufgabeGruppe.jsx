import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import AufgabeRow from './AufgabeRow';

export default function AufgabeGruppe({
  label, tone, tasks, defaultOpen = true, projName, onToggle, onPrioChange, onPin, fadingIds,
}) {
  const [open, setOpen] = useState(defaultOpen);
  if (tasks.length === 0) return null;
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 px-2 py-2 min-h-[40px] hover:bg-cardbg/50 rounded-lg transition-colors"
      >
        {open
          ? <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
          : <ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" />}
        <span className={cn('font-semibold text-sm md:text-base', tone)}>{label}</span>
        <span className="text-xs text-muted-foreground">· {tasks.length}</span>
      </button>
      {open && (
        <div className="ml-1 mt-1 space-y-0.5">
          {tasks.map((t) => (
            <AufgabeRow
              key={t.id}
              task={t}
              projName={projName}
              onToggle={onToggle}
              onPrioChange={onPrioChange}
              onPin={onPin}
              fading={fadingIds.has(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}