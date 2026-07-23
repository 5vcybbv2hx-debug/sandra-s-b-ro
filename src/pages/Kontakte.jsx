import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Building2, ChevronDown, ArrowRight } from 'lucide-react';
import FirmaModal from '@/components/FirmaModal';
import AnsprechpartnerModal from '@/components/AnsprechpartnerModal';
import PersonRow, { isOverdue } from '@/components/kontakte/PersonRow';
import { cn } from '@/lib/utils';

const FILTER_PILLS = [
  { id: 'all', label: 'Alle', dot: null },
  { id: 'active', label: 'Aktive Projekte', dot: null },
  { id: 'overdue', label: 'Kontakt überfällig', dot: 'bg-red-500' },
];

export default function Kontakte() {
  const [firmen, setFirmen] = useState([]);
  const [personen, setPersonen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [expanded, setExpanded] = useState({});
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [f, p, pr] = await Promise.all([
        base44.entities.Firma.list('-name', 500),
        base44.entities.Ansprechpartner.list('-nachname', 500),
        base44.entities.Projekt.list('-updated_date', 500),
      ]);
      setFirmen(f); setPersonen(p); setProjekte(pr);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const apCount = (fid) => personen.filter((p) => p.firma_id === fid).length;
  const activeProjekte = (fid) => projekte.filter((p) => p.firma_id === fid && p.status !== 'Abgeschlossen' && p.status !== 'Archiviert').length;

  const s = search.toLowerCase();
  const firmaSearchMatch = (f) => !s || f.name?.toLowerCase().includes(s) || f.branche?.toLowerCase().includes(s);
  const personSearchMatch = (p) => !s || `${p.vorname} ${p.nachname}`.toLowerCase().includes(s);
  const firmaHasPersonMatch = (fid) => !s || personen.some((p) => p.firma_id === fid && personSearchMatch(p));

  let visibleFirmen = firmen.filter((f) => {
    if (!firmaSearchMatch(f) && !firmaHasPersonMatch(f.id)) return false;
    if (filter === 'active' && activeProjekte(f.id) === 0) return false;
    if (filter === 'overdue' && !personen.some((p) => p.firma_id === f.id && isOverdue(p) && personSearchMatch(p))) return false;
    return true;
  });

  const ohneFirmaPersons = personen.filter((p) => !p.firma_id)
    .filter(personSearchMatch)
    .filter((p) => filter !== 'overdue' || isOverdue(p));
  const showOhneFirma = filter !== 'active' && ohneFirmaPersons.length > 0;

  const shouldExpand = (id) => {
    if (search || filter === 'overdue') return true;
    return !!expanded[id];
  };

  const toggle = (id) => setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));

  const personsForFirma = (fid) => {
    let list = personen.filter((p) => p.firma_id === fid);
    if (search) list = list.filter(personSearchMatch);
    return list;
  };

  const renderFirmaCard = (f) => {
    const active = activeProjekte(f.id);
    const count = apCount(f.id);
    const isOpen = shouldExpand(f.id);
    return (
      <div key={f.id} className="bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
        <div
          onClick={() => toggle(f.id)}
          className="flex items-center gap-3 p-4 cursor-pointer"
        >
          <Building2 className="w-5 h-5 text-brand shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-semibold truncate">{f.name}</p>
              {f.branche && <span className="bg-brand-light text-brand-dark text-xs px-2 py-0.5 rounded-full">{f.branche}</span>}
            </div>
            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
              {active > 0 && <span className="text-green-600 font-medium">{active} Projekte aktiv</span>}
              <span>{count} Kontakte</span>
            </div>
          </div>
          <Link to={`/firmen/${f.id}`} onClick={(e) => e.stopPropagation()} className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-cardbg text-muted-foreground hover:text-brand transition-colors shrink-0">
            <ArrowRight className="w-4 h-4" />
          </Link>
          <ChevronDown className={cn('w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200', isOpen && 'rotate-180')} />
        </div>
        {isOpen && (
          <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border">
            {personsForFirma(f.id).map((p) => (
              <PersonRow key={p.id} person={p} highlightOverdue={filter === 'overdue'} />
            ))}
            {personsForFirma(f.id).length === 0 && <p className="text-sm text-muted-foreground text-center py-4">Keine Personen</p>}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Kontakte</h1>
          <p className="text-muted-foreground text-sm mt-1">{firmen.length} Firmen · {personen.length} Personen</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="min-h-[48px]" onClick={() => setShowFirmaModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Neue Firma
          </Button>
          <Button className="bg-accent hover:bg-accent-dark text-white min-h-[48px]" onClick={() => setShowPersonModal(true)}>
            <Plus className="w-4 h-4 mr-1" /> Neue Person
          </Button>
        </div>
      </div>

      <div className="relative mb-3">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Firma oder Person suchen..." className="pl-10 min-h-[48px]" />
      </div>

      <div className="flex gap-2 flex-wrap mb-6">
        {FILTER_PILLS.map((pill) => (
          <button
            key={pill.id}
            onClick={() => setFilter(pill.id)}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]',
              filter === pill.id ? 'bg-brand text-white' : 'bg-cardbg text-muted-foreground hover:bg-muted'
            )}
          >
            {pill.dot && <span className={cn('w-2 h-2 rounded-full', pill.dot)} />}
            {pill.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div>
      ) : visibleFirmen.length === 0 && !showOhneFirma ? (
        <p className="text-muted-foreground text-center py-12">Keine Kontakte gefunden.</p>
      ) : (
        <div className="space-y-3">
          {visibleFirmen.map(renderFirmaCard)}

          {showOhneFirma && (
            <div className="bg-white border border-border rounded-2xl shadow-sm hover:shadow-md transition-shadow overflow-hidden">
              <div
                onClick={() => toggle('none')}
                className="flex items-center gap-3 p-4 cursor-pointer"
              >
                <Building2 className="w-5 h-5 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold">Privatpersonen / Ohne Firma</p>
                  <p className="text-sm text-muted-foreground mt-1">{ohneFirmaPersons.length} Kontakte</p>
                </div>
                <ChevronDown className={cn('w-5 h-5 text-muted-foreground shrink-0 transition-transform duration-200', (search || filter === 'overdue' || expanded.none) && 'rotate-180')} />
              </div>
              {(search || filter === 'overdue' || expanded.none) && (
                <div className="px-3 pb-3 pt-1 space-y-1 border-t border-border">
                  {ohneFirmaPersons.map((p) => (
                    <PersonRow key={p.id} person={p} highlightOverdue={filter === 'overdue'} />
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {showFirmaModal && <FirmaModal open={showFirmaModal} onClose={() => setShowFirmaModal(false)} onCreated={loadData} />}
      {showPersonModal && <AnsprechpartnerModal open={showPersonModal} onClose={() => setShowPersonModal(false)} onCreated={loadData} />}
    </div>
  );
}