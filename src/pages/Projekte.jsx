import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List, ChevronDown } from 'lucide-react';
import ProjektCard from '@/components/projekt/ProjektCard';
import ProjektStartWizard from '@/components/projekt/ProjektStartWizard';
import { cn } from '@/lib/utils';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];

const STATUS_GROUPS = [
  { status: 'Aktiv', defaultCollapsed: false },
  { status: 'Anfrage', defaultCollapsed: false },
  { status: 'Wartend', defaultCollapsed: true },
  { status: 'Abgeschlossen', defaultCollapsed: true },
  { status: 'Abgebrochen', defaultCollapsed: true },
  { status: 'Archiviert', defaultCollapsed: true },
];

export default function Projekte() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [stundenMap, setStundenMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState('deadline');
  const [view, setView] = useState('list');
  const [showNew, setShowNew] = useState(false);
  const [collapsed, setCollapsed] = useState({
    Wartend: true,
    Abgeschlossen: true,
    Abgebrochen: true,
    Archiviert: true,
  });

  useEffect(() => { loadProjekte(); }, []);

  const loadProjekte = async () => {
    try {
      const [data, fi, zeiten] = await Promise.all([
        base44.entities.Projekt.list('-updated_date', 500),
        base44.entities.Firma.list('-name', 200),
        base44.entities.Zeiteintrag.list('-datum', 500),
      ]);
      setProjekte(data);
      setFirmen(fi);
      const map = {};
      zeiten.forEach((z) => { map[z.projekt_id] = (map[z.projekt_id] || 0) + (z.stunden || 0); });
      setStundenMap(map);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  let filtered = projekte;
  if (statusFilter !== 'all') filtered = filtered.filter((p) => p.status === statusFilter);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((p) => p.projekt_name?.toLowerCase().includes(s) || firmaName(p.firma_id)?.toLowerCase().includes(s));
  }
  if (sortBy === 'deadline') filtered = [...filtered].sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
  else filtered = [...filtered].sort((a, b) => (a.updated_date || '') > (b.updated_date || '') ? -1 : 1);

  const currentYear = new Date().getFullYear();
  const stats = {
    total: projekte.length,
    active: projekte.filter((p) => p.status === 'Aktiv').length,
    completedThisYear: projekte.filter((p) => {
      if (p.status !== 'Abgeschlossen') return false;
      return p.updated_date && new Date(p.updated_date).getFullYear() === currentYear;
    }).length,
    totalBilledHours: projekte
      .filter((p) => p.status === 'Abgeschlossen')
      .reduce((sum, p) => sum + (p.abgerechnete_stunden || 0), 0),
  };

  const grouped = STATUS_GROUPS.map((g) => ({
    ...g,
    items: filtered.filter((p) => p.status === g.status),
  })).filter((g) => g.items.length > 0);

  const otherItems = filtered.filter((p) => !STATUS_GROUPS.some((g) => g.status === p.status));
  if (otherItems.length > 0) {
    grouped.push({ status: 'Sonstige', defaultCollapsed: true, items: otherItems });
  }

  const toggle = (status) => setCollapsed((prev) => ({ ...prev, [status]: !prev[status] }));

  const renderCard = (p) => (
    <ProjektCard
      key={p.id}
      projekt={p}
      firmaName={firmaName}
      stunden={stundenMap[p.id] || 0}
      onUpdate={loadProjekte}
    />
  );

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Projekte</h1>
          <p className="text-muted-foreground text-sm mt-1">{filtered.length} Projekte</p>
        </div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-cardbg rounded-xl p-1">
            <button onClick={() => setView('list')} className={cn('px-3 py-2 rounded-lg min-h-[40px]', view === 'list' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>
              <List className="w-4 h-4" />
            </button>
            <button onClick={() => setView('kanban')} className={cn('px-3 py-2 rounded-lg min-h-[40px]', view === 'kanban' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}>
              <LayoutGrid className="w-4 h-4" />
            </button>
          </div>
          {!isAdmin && (
            <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setShowNew(true)}>
              <Plus className="w-4 h-4 mr-1" /> Neu
            </Button>
          )}
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <div className="bg-cardbg rounded-xl p-3">
          <p className="text-xs text-muted-foreground">Gesamt</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </div>
        <div className="bg-green-50 rounded-xl p-3">
          <p className="text-xs text-green-600">Aktiv</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </div>
        <div className="bg-brand-light rounded-xl p-3">
          <p className="text-xs text-brand-dark">Abgeschlossen {currentYear}</p>
          <p className="text-2xl font-bold text-brand-dark">{stats.completedThisYear}</p>
        </div>
        <div className="bg-accent/10 rounded-xl p-3">
          <p className="text-xs text-accent">Abgerechnete Stunden</p>
          <p className="text-2xl font-bold text-accent">{stats.totalBilledHours} h</p>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="flex flex-col md:flex-row gap-3 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Projekt oder Firma suchen..." className="pl-10 min-h-[48px]" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="md:w-44 min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Alle Status</SelectItem>
                <SelectItem value="Anfrage">Anfrage</SelectItem>
                <SelectItem value="Aktiv">Aktiv</SelectItem>
                <SelectItem value="Wartend">Wartend</SelectItem>
                <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
              </SelectContent>
            </Select>
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="md:w-44 min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="deadline">Nach Deadline</SelectItem>
                <SelectItem value="aktivitaet">Nach Aktivität</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-cardbg rounded-2xl animate-pulse" />)}</div>
          ) : grouped.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Keine Projekte gefunden.</p>
          ) : (
            <div className="space-y-4">
              {grouped.map((group) => {
                const isCollapsed = collapsed[group.status] ?? group.defaultCollapsed;
                return (
                  <div key={group.status}>
                    <button
                      onClick={() => toggle(group.status)}
                      className="flex items-center gap-2 w-full px-1 py-2 text-sm font-semibold text-foreground"
                    >
                      <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isCollapsed && 'rotate-180')} />
                      {group.status}
                      <span className="text-xs font-normal text-muted-foreground bg-cardbg px-2 py-0.5 rounded-full">{group.items.length}</span>
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-200', isCollapsed ? 'max-h-0' : 'max-h-[5000px]')}>
                      <div className="grid gap-3 pt-1">
                        {group.items.map(renderCard)}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4">
          {PHASEN.map((phase) => {
            const phaseProjekte = filtered.filter((p) => (p.aktuelle_phase || 'Entwurf') === phase);
            return (
              <div key={phase} className="min-w-[280px] flex-1">
                <div className="flex items-center justify-between mb-3 px-1">
                  <h3 className="font-semibold">{phase}</h3>
                  <span className="text-sm text-muted-foreground bg-cardbg px-2 py-0.5 rounded-full">{phaseProjekte.length}</span>
                </div>
                <div className="space-y-3">
                  {phaseProjekte.map(renderCard)}
                  {phaseProjekte.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Keine Projekte</p>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showNew && <ProjektStartWizard onClose={() => setShowNew(false)} onCreated={loadProjekte} />}
    </div>
  );
}