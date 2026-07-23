import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Clock } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['Anfrage', 'Aktiv', 'Wartend', 'Abgeschlossen', 'Abgebrochen', 'Archiviert'];

function getDeadlineStatus(projekt) {
  if (!projekt.deadline) return 'green';
  const days = Math.ceil((new Date(projekt.deadline) - new Date()) / 86400000);
  if (days < 0) return 'red';
  if (days <= 2) return 'red';
  if (days <= 7) return 'yellow';
  return 'green';
}
const dlColors = { green: 'border-l-green-500', yellow: 'border-l-amber-500', red: 'border-l-red-500' };

export default function ProjektCard({ projekt, firmaName, stunden, onUpdate }) {
  const navigate = useNavigate();
  const [showAbgerechnet, setShowAbgerechnet] = useState(false);
  const [abgerechnetValue, setAbgerechnetValue] = useState(projekt.abgerechnete_stunden || '');
  const [saving, setSaving] = useState(false);

  const dlStatus = getDeadlineStatus(projekt);

  const handleStatusChange = async (newStatus) => {
    if (newStatus === 'Abgeschlossen') {
      setShowAbgerechnet(true);
      return;
    }
    try {
      await base44.entities.Projekt.update(projekt.id, { status: newStatus });
      toast.success('Status aktualisiert');
      onUpdate();
    } catch {
      toast.error('Fehler beim Aktualisieren');
    }
  };

  const handleSaveAbgerechnet = async () => {
    setSaving(true);
    try {
      await base44.entities.Projekt.update(projekt.id, {
        status: 'Abgeschlossen',
        abgerechnete_stunden: Number(abgerechnetValue) || 0,
      });
      toast.success('Als abgeschlossen markiert');
      setShowAbgerechnet(false);
      onUpdate();
    } catch {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  const handleClick = () => {
    if (showAbgerechnet) return;
    navigate(`/projekte/${projekt.id}`);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        'bg-white border border-border border-l-4 rounded-2xl p-4 hover:shadow-md transition-shadow cursor-pointer',
        dlColors[dlStatus]
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{projekt.projekt_name}</p>
          <p className="text-sm text-muted-foreground truncate">{firmaName(projekt.firma_id)}</p>
        </div>
        <StatusBadge status={projekt.status} />
      </div>

      <div className="flex items-center gap-2 mt-2 text-sm text-muted-foreground flex-wrap">
        <span className="bg-brand-light text-brand-dark text-xs px-2 py-0.5 rounded-full">{projekt.aktuelle_phase || 'Entwurf'}</span>
        {projekt.projektart && projekt.projektart !== 'Sonstiges' && (
          <span className="bg-muted text-muted-foreground text-xs px-2 py-0.5 rounded-full">{projekt.projektart}</span>
        )}
        {projekt.status === 'Abgeschlossen' && projekt.abgerechnete_stunden ? (
          <span className="text-brand-dark font-medium">Ø {projekt.abgerechnete_stunden}h abgerechnet</span>
        ) : (
          <span>{stunden.toFixed(1)} h</span>
        )}
        {projekt.deadline && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" /> {formatDate(projekt.deadline)}
          </span>
        )}
      </div>

      <div className="mt-3 flex items-center justify-end" onClick={(e) => e.stopPropagation()}>
        <Select value={projekt.status} onValueChange={handleStatusChange}>
          <SelectTrigger className="h-8 text-xs w-auto min-w-[130px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s} value={s}>{s}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {showAbgerechnet && (
        <div
          className="mt-2 flex items-center gap-2 p-3 bg-brand-light rounded-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <span className="text-sm text-muted-foreground whitespace-nowrap">Abgerechnete Std.:</span>
          <Input
            type="number"
            value={abgerechnetValue}
            onChange={(e) => setAbgerechnetValue(e.target.value)}
            placeholder="z.B. 120"
            className="h-8 w-24"
            autoFocus
          />
          <Button size="sm" onClick={handleSaveAbgerechnet} disabled={saving} className="h-8 bg-brand hover:bg-brand-dark text-white">
            {saving ? '...' : 'Speichern'}
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setShowAbgerechnet(false)} className="h-8">
            Abbrechen
          </Button>
        </div>
      )}
    </div>
  );
}