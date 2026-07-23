import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, AlertTriangle, FileText, ExternalLink, ChevronRight, Shield } from 'lucide-react';
import VertragFormModal from '@/components/vertraege/VertragFormModal';

const KATEGORIE_STYLES = {
  Software: 'bg-blue-100 text-blue-700',
  Versicherung: 'bg-purple-100 text-purple-700',
  Miete: 'bg-amber-100 text-amber-700',
  Dienstleistung: 'bg-teal-100 text-teal-700',
  Sonstiges: 'bg-gray-100 text-gray-700',
};

const daysUntil = (dateStr) => {
  if (!dateStr) return null;
  const now = new Date(); now.setHours(0, 0, 0, 0);
  const d = new Date(dateStr); d.setHours(0, 0, 0, 0);
  return Math.round((d - now) / (1000 * 60 * 60 * 24));
};

const deadlineColor = (dateStr, status) => {
  if (status !== 'Aktiv') return 'text-muted-foreground';
  const days = daysUntil(dateStr);
  if (days === null) return 'text-muted-foreground';
  if (days <= 30) return 'text-rose-600';
  if (days <= 90) return 'text-amber-600';
  return 'text-emerald-600';
};

export default function Vertraege() {
  const [vertraege, setVertraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editVertrag, setEditVertrag] = useState(null);

  useEffect(() => { loadVertraege(); }, []);

  const loadVertraege = async () => {
    setLoading(true);
    try {
      const v = await base44.entities.Vertrag.list('-naechste_kuendigung', 500);
      setVertraege(v);
    } catch { toast.error('Verträge konnten nicht geladen werden'); }
    finally { setLoading(false); }
  };

  const upcoming = vertraege.filter(v => v.status === 'Aktiv' && daysUntil(v.naechste_kuendigung) !== null && daysUntil(v.naechste_kuendigung) <= 30 && daysUntil(v.naechste_kuendigung) >= 0);
  const totalKosten = vertraege.filter(v => v.status === 'Aktiv').reduce((s, v) => s + (v.kosten_jaehrlich || 0), 0);

  const handleNew = () => { setEditVertrag(null); setModalOpen(true); };
  const handleEdit = (v) => { setEditVertrag(v); setModalOpen(true); };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Verträge</h1>
          <p className="text-sm text-muted-foreground mt-1">{vertraege.length} Vertrag(-Verträge) • {formatCurrency(totalKosten)} / Jahr aktiv</p>
        </div>
        <Button onClick={handleNew} className="bg-brand hover:bg-brand/90 text-white gap-2">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Neuer Vertrag</span>
        </Button>
      </div>

      {/* Warning section */}
      {upcoming.length > 0 && (
        <Card className="p-5 border-rose-200 bg-rose-50/50">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-5 h-5 text-rose-600" />
            <h3 className="font-semibold text-rose-900">Kündigungsfällig in 30 Tagen</h3>
          </div>
          <div className="space-y-2">
            {upcoming.map(v => (
              <div key={v.id} className="flex items-center justify-between gap-3 p-3 bg-white/60 rounded-lg">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{v.titel}</p>
                  <p className="text-xs text-muted-foreground">{v.anbieter} • Frist: {formatDate(v.naechste_kuendigung)}</p>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleEdit(v)} className="shrink-0 text-rose-600 border-rose-200 hover:bg-rose-50">Bearbeiten</Button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Verträge...</div>
      ) : vertraege.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center border-dashed">
          <Shield className="w-14 h-14 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Keine Verträge</h3>
          <p className="text-sm text-muted-foreground mb-4">Erfassen Sie Ihren ersten Vertrag.</p>
          <Button onClick={handleNew} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Neuer Vertrag
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {vertraege.map(v => (
            <Card key={v.id} className="p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleEdit(v)}>
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate" title={v.titel}>{v.titel}</p>
                  <p className="text-xs text-muted-foreground truncate">{v.anbieter || '—'}</p>
                </div>
                <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0', KATEGORIE_STYLES[v.kategorie] || KATEGORIE_STYLES.Sonstiges)}>{v.kategorie}</span>
              </div>
              <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">Nächste Kündigung</p>
                  <p className={cn('text-sm font-semibold', deadlineColor(v.naechste_kuendigung, v.status))}>
                    {formatDate(v.naechste_kuendigung)}
                    {v.status === 'Aktiv' && daysUntil(v.naechste_kuendigung) !== null && daysUntil(v.naechste_kuendigung) >= 0 && (
                      <span className="text-xs ml-1">({daysUntil(v.naechste_kuendigung)} Tage)</span>
                    )}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-muted-foreground">Kosten/Jahr</p>
                  <p className="text-sm font-bold">{formatCurrency(v.kosten_jaehrlich)}</p>
                </div>
              </div>
              {v.dokument_url && (
                <a href={v.dokument_url} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="flex items-center gap-1 text-xs text-brand hover:underline mt-2">
                  <FileText className="w-3 h-3" /> Dokument öffnen
                </a>
              )}
            </Card>
          ))}
        </div>
      )}

      <VertragFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadVertraege} editVertrag={editVertrag} />
    </div>
  );
}