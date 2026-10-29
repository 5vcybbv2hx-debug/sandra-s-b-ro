import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Lightbulb, Loader2 } from 'lucide-react';
import WunschQuickForm from '@/components/aenderungen/WunschQuickForm';
import WunschRow from '@/components/aenderungen/WunschRow';
import WunschEditModal from '@/components/aenderungen/WunschEditModal';
import { BEREICHE, STATUS, PRIO_ORDER } from '@/components/aenderungen/wunschConstants';

export default function Aenderungswuensche() {
  const { user } = useAuth();
  const [wuensche, setWuensche] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('Alle');
  const [bereichFilter, setBereichFilter] = useState('Alle');
  const [editWunsch, setEditWunsch] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const list = await base44.entities.Aenderungswunsch.list('-created_date', 500);
      setWuensche(list);
    } catch { toast.error('Wünsche konnten nicht geladen werden'); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleStatus = async (wunsch, status) => {
    setWuensche(prev => prev.map(w => (w.id === wunsch.id ? { ...w, status } : w)));
    try {
      await base44.entities.Aenderungswunsch.update(wunsch.id, { status });
    } catch {
      toast.error('Status konnte nicht gespeichert werden');
      load();
    }
  };

  const handleDelete = async (wunsch) => {
    try {
      await base44.entities.Aenderungswunsch.delete(wunsch.id);
      setWuensche(prev => prev.filter(w => w.id !== wunsch.id));
      toast.success('Wunsch gelöscht');
    } catch { toast.error('Löschen fehlgeschlagen'); }
  };

  const openCount = wuensche.filter(w => w.status === 'Neu').length;
  const filtered = wuensche
    .filter(w => statusFilter === 'Alle' || w.status === statusFilter)
    .filter(w => bereichFilter === 'Alle' || w.bereich === bereichFilter)
    .sort((a, b) => (PRIO_ORDER[a.prioritaet] ?? 1) - (PRIO_ORDER[b.prioritaet] ?? 1));

  const groups = statusFilter === 'Alle'
    ? STATUS.map(s => ({ status: s, items: filtered.filter(w => w.status === s) })).filter(g => g.items.length)
    : [{ status: statusFilter, items: filtered }];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Änderungswünsche</h1>
          <p className="text-sm text-muted-foreground mt-1">Ideen und Verbesserungen sammeln und gesammelt prüfen.</p>
        </div>
        <div className="shrink-0 rounded-2xl px-4 py-2 text-center bg-brand-light border border-brand/20">
          <p className="text-2xl font-bold text-brand-dark leading-none">{openCount}</p>
          <p className="text-[11px] font-medium text-brand-dark/80 mt-0.5">offen (Neu)</p>
        </div>
      </div>

      <WunschQuickForm defaultName={user?.full_name || ''} onCreated={load} />

      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto">
          {['Alle', ...STATUS].map(s => {
            const n = s === 'Alle' ? wuensche.length : wuensche.filter(w => w.status === s).length;
            return (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap min-h-[36px] transition-colors',
                  statusFilter === s ? 'bg-brand text-white border-brand' : 'bg-white text-muted-foreground border-border hover:bg-cardbg'
                )}
              >
                {s}{s !== 'Alle' && ` (${n})`}
              </button>
            );
          })}
        </div>
        <Select value={bereichFilter} onValueChange={setBereichFilter}>
          <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="Alle">Alle Bereiche</SelectItem>
            {BEREICHE.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" /> Lade Wünsche…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="p-10 flex flex-col items-center text-center border-dashed">
          <Lightbulb className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <p className="font-medium">Keine Wünsche in dieser Auswahl</p>
          <p className="text-sm text-muted-foreground mt-1">Neue Wünsche oben erfassen.</p>
        </Card>
      ) : (
        <div className="space-y-6">
          {groups.map(g => (
            <div key={g.status} className="space-y-2">
              {statusFilter === 'Alle' && (
                <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
                  {g.status} · {g.items.length}
                </h2>
              )}
              {g.items.map(w => (
                <WunschRow key={w.id} wunsch={w} onStatusChange={handleStatus} onEdit={setEditWunsch} onDelete={handleDelete} />
              ))}
            </div>
          ))}
        </div>
      )}

      <WunschEditModal wunsch={editWunsch} onClose={() => setEditWunsch(null)} onSaved={load} />
    </div>
  );
}