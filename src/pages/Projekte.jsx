import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Clock, CheckCircle, ChevronRight } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import NeuesProjektModal from '@/components/projekt/NeuesProjektModal';
import { formatDate, formatCurrency } from '@/lib/format';

function ProjektCard({ projekt, stundenMap }) {
  const stunden = stundenMap[projekt.id] || 0;
  return (
    <Link
      to={`/projekte/${projekt.id}`}
      className="block bg-white border border-border rounded-2xl p-4 hover:shadow-md transition-shadow min-h-[48px]"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold truncate">{projekt.projekt_name}</p>
          <p className="text-sm text-muted-foreground truncate">{projekt.kunde_name}</p>
        </div>
        <StatusBadge status={projekt.status} />
      </div>
      <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
        {projekt.deadline && (
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {formatDate(projekt.deadline)}
          </span>
        )}
        <span className="flex items-center gap-1">
          {stunden.toFixed(1)} h
        </span>
        {projekt.ist_abgerechnet && (
          <span className="flex items-center gap-1 text-status-abgeschlossen">
            <CheckCircle className="w-3.5 h-3.5" /> Abgerechnet
          </span>
        )}
        {projekt.abrechnungsart === 'Pauschal' && (
          <span className="text-muted-foreground">{formatCurrency(projekt.pauschalbetrag)}</span>
        )}
      </div>
    </Link>
  );
}

export default function Projekte() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projekte, setProjekte] = useState([]);
  const [stundenMap, setStundenMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => {
    loadProjekte();
  }, []);

  const loadProjekte = async () => {
    try {
      const data = await base44.entities.Projekt.list('-updated_date', 200);
      setProjekte(data);
      // Load all zeiteinträge to compute hours per project
      const zeiten = await base44.entities.Zeiteintrag.list('-datum', 500);
      const map = {};
      zeiten.forEach((z) => {
        map[z.projekt_id] = (map[z.projekt_id] || 0) + (z.stunden || 0);
      });
      setStundenMap(map);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  let filtered = projekte;
  if (statusFilter !== 'all') filtered = filtered.filter((p) => p.status === statusFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter(
      (p) => p.projekt_name?.toLowerCase().includes(s) || p.kunde_name?.toLowerCase().includes(s)
    );
  }
  if (sortBy === 'deadline') {
    filtered = [...filtered].sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
  } else {
    filtered = [...filtered].sort((a, b) => (a.updated_date || '') > (b.updated_date || '') ? -1 : 1);
  }

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Projekte</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} Projekte</p>
        </div>
        {!isAdmin && (
          <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setShowNew(true)}>
            <Plus className="w-4 h-4 mr-1" /> Neu
          </Button>
        )}
      </div>

      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Projekt oder Kunde suchen..."
            className="pl-10 min-h-[48px]"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="md:w-48 min-h-[48px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Alle Status</SelectItem>
            <SelectItem value="Anfrage">Anfrage</SelectItem>
            <SelectItem value="Aktiv">Aktiv</SelectItem>
            <SelectItem value="Wartend">Wartend</SelectItem>
            <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
            <SelectItem value="Archiviert">Archiviert</SelectItem>
          </SelectContent>
        </Select>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="md:w-48 min-h-[48px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deadline">Nach Deadline</SelectItem>
            <SelectItem value="aktivitaet">Nach Aktivität</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Lade Projekte...</p>
      ) : (
        <div className="grid gap-3">
          {filtered.map((p) => (
            <ProjektCard key={p.id} projekt={p} stundenMap={stundenMap} />
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-12">Keine Projekte gefunden.</p>
          )}
        </div>
      )}

      {showNew && <NeuesProjektModal onClose={() => setShowNew(false)} onCreated={loadProjekte} />}
    </div>
  );
}