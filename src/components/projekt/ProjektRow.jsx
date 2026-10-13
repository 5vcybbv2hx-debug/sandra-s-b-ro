import { useNavigate } from 'react-router-dom';
import StatusBadge from '@/components/StatusBadge';
import { Clock } from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function ProjektRow({ projekt }) {
  const navigate = useNavigate();
  return (
    <button
      onClick={() => navigate(`/projekte/${projekt.id}`)}
      className="w-full py-3 px-3 hover:bg-muted/40 rounded-lg transition-colors text-left min-h-[52px]"
    >
      <div className="flex items-center justify-between gap-2">
        <p className="font-medium truncate text-sm">{projekt.projekt_name}</p>
        <StatusBadge status={projekt.status} />
      </div>
      <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
        <span>{projekt.aktuelle_phase || 'Entwurf'}</span>
        {projekt.deadline && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDate(projekt.deadline)}
          </span>
        )}
      </div>
    </button>
  );
}