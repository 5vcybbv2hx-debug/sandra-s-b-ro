import { cn } from '@/lib/utils';

const statusConfig = {
  Anfrage: 'bg-status-anfrage/10 text-status-anfrage',
  Aktiv: 'bg-status-aktiv/10 text-status-aktiv',
  Wartend: 'bg-status-wartend/10 text-status-wartend',
  Abgeschlossen: 'bg-status-abgeschlossen/10 text-status-abgeschlossen',
  Archiviert: 'bg-status-archiviert/10 text-status-archiviert',
};

export default function StatusBadge({ status }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap', statusConfig[status] || statusConfig.Anfrage)}>
      {status}
    </span>
  );
}