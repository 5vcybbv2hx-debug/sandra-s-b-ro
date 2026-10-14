import { Check, Sun } from 'lucide-react';
import { cn } from '@/lib/utils';
import AufgabeRow from './AufgabeRow';

export default function MeinTagBlock({ tasks, projName, onToggle, onPin, fadingIds }) {
  if (tasks.length === 0) return null;
  return (
    <div className="rounded-2xl border border-brand/20 bg-brand-light/20 p-3 md:p-4">
      <div className="flex items-center gap-2 px-2 mb-1">
        <Sun className="w-4 h-4 text-brand" />
        <h2 className="font-semibold text-brand-dark">Mein Tag</h2>
        <span className="text-xs text-muted-foreground">· {tasks.length}</span>
      </div>
      <div className="space-y-0.5">
        {tasks.map((t) => (
          <AufgabeRow
            key={t.id}
            task={t}
            projName={projName}
            onToggle={onToggle}
            onPin={onPin}
            showPrio={false}
            fading={fadingIds.has(t.id)}
          />
        ))}
      </div>
    </div>
  );
}