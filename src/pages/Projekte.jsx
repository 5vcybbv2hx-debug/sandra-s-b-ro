import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, LayoutGrid, List, Pin, Clock, X } from 'lucide-react';
import ProjektCard from '@/components/projekt/ProjektCard';
import ProjektStartWizard from '@/components/projekt/ProjektStartWizard';
import { cn } from '@/lib/utils';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];

const FILTER_STORAGE_KEY = 'projekte_filter_v1';

function loadSavedFilters() {
  try {
    const raw = localStorage.getItem(FILTER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

export default function Projekte() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const saved = loadSavedFilters();
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [stundenMap, setStundenMap] = useState({});
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(saved.statusFilter ?? 'all');
  const [firmaFilter, setFirmaFilter] = useState(saved.firmaFilter ?? 'all');
  const [pinnedOnly, setPinnedOnly] = useState(saved.pinnedOnly ?? false);
  const [urgentOnly, setUrgentOnly] = useState(saved.urgentOnly ?? false);
  const [sortBy, setSortBy] = useState(saved.sortBy ?? 'deadline');
  const [view, setView] = useState('list');
  const [showNew, setShowNew] = useState(false);
  useEffect(() => { loadProjekte(); }, []);

  // Filter-Auswahl merken (smart: nächster Besuch startet mit gleicher Ansicht)
  useEffect(() => {
    localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify({ statusFilter, firmaFilter, pinnedOnly, urgentOnly, sortBy }));
  }, [statusFilter, firmaFilter, pinnedOnly, urgentOnly, sortBy]);

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

  const in14Days = new Date(); in14Days.setDate(in14Days.getDate() + 14);
  const in14ISO = in14Days.toISOString().slice(0, 10);

  let filtered = projekte;
  if (statusFilter !== 'all') filtered = filtered.filter((p) => p.status === statusFilter);
  if (firmaFilter !== 'all') filtered = filtered.filter((p) => p.firma_id === firmaFilter);
  if (pinnedOnly) filtered = filtered.filter((p) => p.pinned);
  if (urgentOnly) filtered = filtered.filter((p) => p.deadline && p.deadline <= in14ISO);
  if (search) {
    const s = search.toLowerCase();
    filtered = filtered.filter((p) => p.projekt_name?.toLowerCase().includes(s) || firmaName(p.firma_id)?.toLowerCase().includes(s));
  }
  if (sortBy === 'deadline') filtered = [...filtered].sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
  else if (sortBy === 'alphabetisch') filtered = [...filtered].sort((a, b) => (a.projekt_name || '').localeCompare(b.projekt_name || ''));
  else filtered = [...filtered].sort((a, b) => (a.updated_date || '') > (b.updated_date || '') ? -1 : 1);

  // Counts für Status-Chips (unabhängig von aktivem Status-Filter, aber abhängig von Suche/Firma/Pin/Urgent)
  const baseForCounts = projekte.filter((p) => {
    if (firmaFilter !== 'all' && p.firma_id !== firmaFilter) return false;
    if (pinnedOnly && !p.pinned) return false;
    if (urgentOnly && !(p.deadline && p.deadline <= in14ISO)) return false;
    if (search) {
      const s = search.toLowerCase();
      if (!(p.projekt_name?.toLowerCase().includes(s) || firmaName(p.firma_id)?.toLowerCase().includes(s))) return false;
    }
    return true;
  });
  const statusCounts = {
    all: baseForCounts.length,
    Anfrage: baseForCounts.filter((p) => p.status === 'Anfrage').length,
    Aktiv: baseForCounts.filter((p) => p.status === 'Aktiv').length,
    Wartend: baseForCounts.filter((p) => p.status === 'Wartend').length,
    Abgeschlossen: baseForCounts.filter((p) => p.status === 'Abgeschlossen').length,
  };
  const urgentCount = projekte.filter((p) => p.deadline && p.deadline <= in14ISO && p.status === 'Aktiv').length;
  const pinnedCount = projekte.filter((p) => p.pinned).length;
  const hasActiveFilters = statusFilter !== 'all' || firmaFilter !== 'all' || pinnedOnly || urgentOnly || search;

  const resetFilters = () => {
    setStatusFilter('all'); setFirmaFilter('all'); setPinnedOnly(false); setUrgentOnly(false); setSearch('');
  };

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

      {/* Stats Bar — klickbar zum Filtern */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={() => setStatusFilter('all')} className="bg-cardbg rounded-xl p-3 text-left hover:ring-2 hover:ring-brand/30 transition-shadow">
          <p className="text-xs text-muted-foreground">Gesamt</p>
          <p className="text-2xl font-bold">{stats.total}</p>
        </button>
        <button onClick={() => setStatusFilter('Aktiv')} className="bg-green-50 rounded-xl p-3 text-left hover:ring-2 hover:ring-green-300 transition-shadow">
          <p className="text-xs text-green-600">Aktiv</p>
          <p className="text-2xl font-bold text-green-700">{stats.active}</p>
        </button>
        <button onClick={() => setStatusFilter('Abgeschlossen')} className="bg-brand-light rounded-xl p-3 text-left hover:ring-2 hover:ring-brand/30 transition-shadow">
          <p className="text-xs text-brand-dark">Abgeschlossen {currentYear}</p>
          <p className="text-2xl font-bold text-brand-dark">{stats.completedThisYear}</p>
        </button>
        <div className="bg-accent/10 rounded-xl p-3">
          <p className="text-xs text-accent">Abgerechnete Stunden</p>
          <p className="text-2xl font-bold text-accent">{stats.totalBilledHours} h</p>
        </div>
      </div>

      {view === 'list' && (
        <>
          <div className="space-y-3 mb-6">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Projekt oder Firma suchen..." className="pl-10 min-h-[48px]" />
              </div>
              <Select value={firmaFilter} onValueChange={setFirmaFilter}>
                <SelectTrigger className="md:w-52 min-h-[48px]"><SelectValue placeholder="Alle Firmen" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Alle Firmen</SelectItem>
                  {firmen.map((f) => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="md:w-44 min-h-[48px]"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="deadline">Nach Deadline</SelectItem>
                  <SelectItem value="aktivitaet">Nach Aktivität</SelectItem>
                  <SelectItem value="alphabetisch">Alphabetisch</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Smart Status-Chips mit Live-Counts */}
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { key: 'all', label: 'Alle' },
                { key: 'Aktiv', label: 'Aktiv' },
                { key: 'Anfrage', label: 'Anfrage' },
                { key: 'Wartend', label: 'Wartend' },
                { key: 'Abgeschlossen', label: 'Abgeschlossen' },
              ].map((s) => (
                <button
                  key={s.key}
                  onClick={() => setStatusFilter(s.key)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] transition-colors border',
                    statusFilter === s.key
                      ? 'bg-brand text-white border-brand'
                      : 'bg-cardbg text-muted-foreground border-transparent hover:bg-brand-light/50'
                  )}
                >
                  {s.label} <span className="opacity-70">{statusCounts[s.key] ?? 0}</span>
                </button>
              ))}

              <div className="w-px h-5 bg-border mx-1" />

              <button
                onClick={() => setUrgentOnly((v) => !v)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] transition-colors border flex items-center gap-1.5',
                  urgentOnly
                    ? 'bg-amber-500 text-white border-amber-500'
                    : 'bg-cardbg text-muted-foreground border-transparent hover:bg-amber-50'
                )}
              >
                <Clock className="w-3.5 h-3.5" /> Bald fällig {urgentCount > 0 && <span className="opacity-70">{urgentCount}</span>}
              </button>

              <button
                onClick={() => setPinnedOnly((v) => !v)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-sm font-medium min-h-[36px] transition-colors border flex items-center gap-1.5',
                  pinnedOnly
                    ? 'bg-brand text-white border-brand'
                    : 'bg-cardbg text-muted-foreground border-transparent hover:bg-brand-light/50'
                )}
              >
                <Pin className="w-3.5 h-3.5" /> Angeheftet {pinnedCount > 0 && <span className="opacity-70">{pinnedCount}</span>}
              </button>

              {hasActiveFilters && (
                <button onClick={resetFilters} className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground min-h-[36px] flex items-center gap-1">
                  <X className="w-3.5 h-3.5" /> Filter zurücksetzen
                </button>
              )}
            </div>
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-24 bg-cardbg rounded-2xl animate-pulse" />)}</div>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Keine Projekte gefunden.</p>
          ) : (
            <div className="grid gap-3">
              {filtered.map(renderCard)}
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