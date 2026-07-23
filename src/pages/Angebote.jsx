import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, FileText, Search, ChevronRight } from 'lucide-react';
import AngebotFormModal from '@/components/angebote/AngebotFormModal';

const STATUS_STYLES = {
  Entwurf: 'bg-gray-100 text-gray-700',
  Verschickt: 'bg-blue-100 text-blue-700',
  Angenommen: 'bg-emerald-100 text-emerald-700',
  Abgelehnt: 'bg-rose-100 text-rose-700',
  Archiviert: 'bg-muted text-muted-foreground',
};

export default function Angebote() {
  const [angebote, setAngebote] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editAngebot, setEditAngebot] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [firmaFilter, setFirmaFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => { loadAll(); }, []);

  const loadAll = async () => {
    setLoading(true);
    try {
      const [a, f, p] = await Promise.all([
        base44.entities.Angebot.list('-datum', 500),
        base44.entities.Firma.list('name', 500),
        base44.entities.Projekt.list('-created_date', 500),
      ]);
      setAngebote(a);
      setFirmen(f);
      setProjekte(p);
    } catch { toast.error('Daten konnten nicht geladen werden'); }
    finally { setLoading(false); }
  };

  const firmaName = (id) => firmen.find(f => f.id === id)?.name || '—';

  const filtered = angebote.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (firmaFilter !== 'all' && a.firma_id !== firmaFilter) return false;
    if (search && !(`${a.nummer} ${a.betreff} ${firmaName(a.firma_id)}`.toLowerCase().includes(search.toLowerCase()))) return false;
    return true;
  });

  const handleNew = () => { setEditAngebot(null); setModalOpen(true); };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Angebote</h1>
          <p className="text-sm text-muted-foreground mt-1">{filtered.length} Angebot(e)</p>
        </div>
        <Button onClick={handleNew} className="bg-brand hover:bg-brand/90 text-white gap-2">
          <Plus className="w-4 h-4" /> <span className="hidden sm:inline">Neues Angebot</span>
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Suchen..." className="pl-9" />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-44"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            {Object.keys(STATUS_STYLES).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={firmaFilter} onValueChange={setFirmaFilter}>
          <SelectTrigger className="w-full sm:w-48"><SelectValue placeholder="Firma" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Firmen</SelectItem>
            {firmen.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Angebote...</div>
      ) : filtered.length === 0 ? (
        <Card className="p-12 flex flex-col items-center text-center border-dashed">
          <FileText className="w-14 h-14 text-muted-foreground/40 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Keine Angebote</h3>
          <p className="text-sm text-muted-foreground mb-4">Erstellen Sie Ihr erstes Angebot.</p>
          <Button onClick={handleNew} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Neues Angebot
          </Button>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtered.map(a => (
            <Link key={a.id} to={`/angebote/${a.id}`}>
              <Card className="p-4 hover:shadow-md transition-shadow cursor-pointer h-full">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="min-w-0">
                    <p className="font-mono text-sm font-semibold text-brand">{a.nummer}</p>
                    <p className="font-medium text-sm truncate" title={a.betreff}>{a.betreff}</p>
                    <p className="text-xs text-muted-foreground truncate">{firmaName(a.firma_id)}</p>
                  </div>
                  <span className={cn('text-xs font-medium px-2 py-1 rounded-full shrink-0', STATUS_STYLES[a.status] || STATUS_STYLES.Entwurf)}>{a.status}</span>
                </div>
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                  <span className="text-lg font-bold text-foreground">{formatCurrency(a.betrag_brutto)}</span>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <span>{formatDate(a.datum)}</span>
                    <ChevronRight className="w-3 h-3" />
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      <AngebotFormModal open={modalOpen} onClose={() => setModalOpen(false)} onSaved={loadAll} editAngebot={editAngebot} firmen={firmen} projekte={projekte} />
    </div>
  );
}