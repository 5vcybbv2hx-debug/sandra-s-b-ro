import { Link } from 'react-router-dom';
import { Phone, Mail } from 'lucide-react';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const getAmpelColor = (d) => {
  if (!d) return 'bg-red-500';
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days < 30 ? 'bg-green-500' : days < 90 ? 'bg-amber-500' : 'bg-red-500';
};

export const isOverdue = (p) => {
  if (!p.letzter_kontakt) return true;
  return Math.floor((Date.now() - new Date(p.letzter_kontakt)) / 86400000) > 90;
};

export default function PersonRow({ person, highlightOverdue }) {
  const initials = ((person.vorname?.[0] || '') + (person.nachname?.[0] || '')).toUpperCase() || '?';
  const overdue = highlightOverdue && isOverdue(person);

  return (
    <div className={cn('flex items-center gap-3 p-2 rounded-xl transition-colors', overdue ? 'bg-red-50 ring-1 ring-red-200' : 'hover:bg-cardbg')}>
      <div className="w-9 h-9 rounded-full bg-accent/10 text-accent flex items-center justify-center text-sm font-semibold shrink-0">
        {initials}
      </div>
      <Link to={`/personen/${person.id}`} className="min-w-0 flex-1" onClick={(e) => e.stopPropagation()}>
        <p className="font-medium truncate hover:text-accent transition-colors">{person.vorname} {person.nachname}</p>
        {person.rolle && <p className="text-xs text-muted-foreground truncate">{person.rolle}</p>}
      </Link>
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1">
          <div className={cn('w-2.5 h-2.5 rounded-full', getAmpelColor(person.letzter_kontakt))} />
          {person.letzter_kontakt
            ? <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(person.letzter_kontakt)}</span>
            : <span className="text-xs text-red-500">nie</span>}
        </div>
        {person.telefon && (
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `tel:${person.telefon}`; }} className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white transition-colors">
            <Phone className="w-3.5 h-3.5" />
          </button>
        )}
        {person.email && (
          <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `mailto:${person.email}`; }} className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white transition-colors">
            <Mail className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}