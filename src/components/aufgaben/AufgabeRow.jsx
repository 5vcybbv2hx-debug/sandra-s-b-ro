import { Link } from 'react-router-dom';
import { Check, Calendar, FolderKanban, Pin } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { initialsOf } from '@/lib/aufgabeGroups';

const PRIO_DOT = { A: 'bg-accent', B: 'bg-brand', C: 'bg-muted-foreground/40' };

export default function AufgabeRow({
  task, projName, onToggle, onPrioChange, onPin, fading = false,
  showPin = true, showPrio = true, compact = false,
}) {
  const overdue = task.faellig_am && task.faellig_am < new Date().toISOString().split('T')[0];
  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-xl transition-all duration-500 min-h-[48px]',
        compact ? 'px-2 py-2' : 'px-3 py-3',
        'hover:bg-cardbg',
        fading && 'opacity-0 scale-95 pointer-events-none'
      )}
    >
      <button
        onClick={() => onToggle(task)}
        className={cn(
          'w-6 h-6 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors',
          task.erledigt
            ? 'bg-status-abgeschlossen border-status-abgeschlossen'
            : 'border-muted-foreground/30 hover:border-brand'
        )}
        aria-label="Erledigt"
      >
        {task.erledigt && <Check className="w-4 h-4 text-white" />}
      </button>

      <div className="flex-1 min-w-0">
        <p className={cn('font-medium truncate', task.erledigt && 'line-through text-muted-foreground')}>
          {task.titel}
        </p>
        <div className="flex items-center gap-2 flex-wrap mt-0.5">
          {task.projekt_id && (
            <Link
              to={`/projekte/${task.projekt_id}`}
              className="text-xs text-accent hover:underline flex items-center gap-1"
            >
              <FolderKanban className="w-3 h-3" /> {projName(task.projekt_id)}
            </Link>
          )}
          {task.faellig_am && (
            <span className={cn('text-xs flex items-center gap-1', overdue ? 'text-red-500' : 'text-muted-foreground')}>
              <Calendar className="w-3 h-3" /> {formatDate(task.faellig_am)}
            </span>
          )}
          {task.zugewiesen_an_name && (
            <span
              className="text-xs text-white bg-brand-dark/70 rounded-full px-2 py-0.5 font-medium"
              title={task.zugewiesen_an_name}
            >
              {initialsOf(task.zugewiesen_an_name)}
            </span>
          )}
        </div>
      </div>

      {showPin && (
        <button
          onClick={() => onPin(task)}
          className={cn(
            'w-8 h-8 rounded-lg flex items-center justify-center shrink-0 transition-colors',
            task.heute_fokussiert
              ? 'text-accent hover:bg-accent-light/50'
              : 'text-muted-foreground/40 hover:text-accent hover:bg-accent-light/50'
          )}
          title={task.heute_fokussiert ? 'Aus Meinem Tag entfernen' : 'Zu Meinem Tag'}
        >
          <Pin className={cn('w-4 h-4', task.heute_fokussiert && 'fill-current')} />
        </button>
      )}

      {showPrio && (
        <div className="flex items-center gap-2 shrink-0">
          <span className={cn('w-2 h-2 rounded-full', PRIO_DOT[task.prioritaet] || PRIO_DOT.C)} />
          <Select value={task.prioritaet} onValueChange={(v) => onPrioChange(task, v)}>
            <SelectTrigger className="w-14 h-8 min-h-[32px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A</SelectItem>
              <SelectItem value="B">B</SelectItem>
              <SelectItem value="C">C</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}
    </div>
  );
}