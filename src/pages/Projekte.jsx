import { useState, useEffect, useMemo } from 'react';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Pin, X } from 'lucide-react';
import ProjektRow from '@/components/projekt/ProjektRow';
import KundenGruppe from '@/components/projekt/KundenGruppe';
import ProjektStartWizard from '@/components/projekt/ProjektStartWizard';
import { cn } from '@/lib/utils';

const OHNE_KEY = '__ohne__';
const OHNE_LABEL = 'Ohne Kundenangabe';

export default function Projekte() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilterRaw] = useState(() => {
    try { return sessionStorage.getItem('projekte_statusFilter') || 'Aktiv'; } catch { return 'Aktiv'; }
  });
  const setStatusFilter = (val) => {
    setStatusFilterRaw(val);
    try { sessionStorage.setItem('projekte_statusFilter', val); } catch {}
  };
  const [expandedGroups, setExpandedGroups] = useState(new Set());
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { loadProjekte(); }, []);

  const loadProjekte = async () => {
    try {
      const data = await base44.entities.Projekt.list('-updated_date', 500);
      setProjekte(data);
      if (isAdmin) {
        try {
          const fi = await base44.entities.Firma.list('-name', 200);
          setFirmen(fi);
        } catch { setFirmen([]); }
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  const getGroupKey = (p) => {
    if (isAdmin) {
      return p.firma_id ? (firmaName(p.firma_id) || OHNE_KEY) : OHNE_KEY;
    }
    const name = p.projekt_name || '';
    const commaIdx = name.indexOf(',');
    const prefix = commaIdx > 0 ? name.substring(0, commaIdx).trim() : name.trim();
    return prefix || OHNE_KEY;
  };

  // Apply status + search filters
  const filtered = useMemo(() => {
    let result = projekte;
    if (statusFilter === 'Aktiv') result = result.filter((p) => p.status === 'Aktiv');
    else if (statusFilter === 'Abgeschlossen') result = result.filter((p) => p.status === 'Abgeschlossen' || p.ist_abgerechnet);
    if (search) {
      const s = search.toLowerCase();
      result = result.filter((p) => {
        const pName = p.projekt_name?.toLowerCase().includes(s);
        const fName = isAdmin ? firmaName(p.firma_id)?.toLowerCase().includes(s) : false;
        return pName || fName;
      });
    }
    return result;
  }, [projekte, statusFilter, search, isAdmin, firmen]);

  // Pinned projects (respecting filter + search), sorted by pinned_order
  const pinnedProjekte = useMemo(
    () => filtered.filter((p) => p.pinned).sort((a, b) => (a.pinned_order || 0) - (b.pinned_order || 0)),
    [filtered]
  );

  // Group all filtered projects by customer
  const grouped = useMemo(() => {
    const groups = new Map();
    filtered.forEach((p) => {
      const key = getGroupKey(p);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(p);
    });
    groups.forEach((items) => {
      items.sort((a, b) => {
        const dl = (a.deadline || '9999').localeCompare(b.deadline || '9999');
        if (dl !== 0) return dl;
        return (a.projekt_name || '').localeCompare(b.projekt_name || '');
      });
    });
    const activeCounts = new Map();
    filtered.forEach((p) => {
      if (p.status === 'Aktiv') {
        const key = getGroupKey(p);
        activeCounts.set(key, (activeCounts.get(key) || 0) + 1);
      }
    });
    const sortedKeys = Array.from(groups.keys()).sort((a, b) => {
      if (a === OHNE_KEY) return 1;
      if (b === OHNE_KEY) return -1;
      const aActive = (activeCounts.get(a) || 0) > 0 ? 1 : 0;
      const bActive = (activeCounts.get(b) || 0) > 0 ? 1 : 0;
      if (aActive !== bActive) return bActive - aActive;
      return a.localeCompare(b);
    });
    return sortedKeys.map((key) => ({ key, label: key === OHNE_KEY ? OHNE_LABEL : key, projekte: groups.get(key), hasActive: (activeCounts.get(key) || 0) > 0 }));
  }, [filtered, isAdmin, firmen]);

  // Active counts per group (from filtered set)
  const activeCountByGroup = useMemo(() => {
    const counts = new Map();
    filtered.forEach((p) => {
      if (p.status === 'Aktiv') {
        const key = getGroupKey(p);
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    return counts;
  }, [filtered, isAdmin, firmen]);

  // Auto-expand: search/filter active → all matching groups; default → groups with active projects
  useEffect(() => {
    if (search || statusFilter !== 'all') {
      setExpandedGroups(new Set(grouped.map((g) => g.key)));
    } else {
      const next = new Set();
      grouped.forEach((g) => { if (activeCountByGroup.get(g.key) > 0) next.add(g.key); });
      setExpandedGroups(next);
    }
  }, [search, statusFilter, grouped, activeCountByGroup]);

  const toggleGroup = (key) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key); else next.add(key);
      return next;
    });
  };

  const statusCounts = {
    all: projekte.length,
    Aktiv: projekte.filter((p) => p.status === 'Aktiv').length,
    Abgeschlossen: projekte.filter((p) => p.status === 'Abgeschlossen' || p.ist_abgerechnet).length,
  };

  return (
    <div className="p-4 md:p-8 max-w-[1150px] mx-auto">
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

      {/* Search */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={isAdmin ? 'Projekt oder Firma suchen...' : 'Projekt suchen...'}
          className="pl-10 min-h-[48px]"
        />
      </div>

      {/* Filter Chips */}
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        {[
          { key: 'all', label: 'Alle' },
          { key: 'Aktiv', label: 'Aktiv' },
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
        {search && (
          <button onClick={() => setSearch('')} className="px-3 py-1.5 rounded-full text-sm text-muted-foreground hover:text-foreground min-h-[36px] flex items-center gap-1">
            <X className="w-3.5 h-3.5" /> Zurücksetzen
          </button>
        )}
      </div>

      {/* Pinned Section */}
      {pinnedProjekte.length > 0 && (
        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 px-1">
            <Pin className="w-4 h-4 text-brand" />
            <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Angepinnt</h2>
          </div>
          <div className="border border-border rounded-2xl overflow-hidden bg-white divide-y divide-border/40">
            {pinnedProjekte.map((p) => <ProjektRow key={p.id} projekt={p} />)}
          </div>
        </div>
      )}

      {/* Customer Groups */}
      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-16 bg-cardbg rounded-2xl animate-pulse" />)}</div>
      ) : grouped.length === 0 && pinnedProjekte.length === 0 ? (
        <p className="text-muted-foreground text-center py-12">Keine Projekte gefunden.</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {grouped.map((g) => (
            <KundenGruppe
              key={g.key}
              groupName={g.label}
              projekte={g.projekte}
              activeCount={activeCountByGroup.get(g.key) || 0}
              dimmed={!g.hasActive}
              expanded={expandedGroups.has(g.key)}
              onToggle={() => toggleGroup(g.key)}
            />
          ))}
        </div>
      )}

      {showNew && <ProjektStartWizard onClose={() => setShowNew(false)} onCreated={loadProjekte} />}
    </div>
  );
}