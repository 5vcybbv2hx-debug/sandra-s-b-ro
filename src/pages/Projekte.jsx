import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Clock, LayoutGrid, List } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ProjektStartWizard from '@/components/projekt/ProjektStartWizard';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];

function getDeadlineStatus(projekt) {
  if (!projekt.deadline) return 'green';
  const days = Math.ceil((new Date(projekt.deadline) - new Date()) / 86400000);
  if (days < 0) return 'red'; if (days <= 2) return 'red'; if (days <= 7) return 'yellow'; return 'green';
}
const dlColors = { green: 'border-l-green-500', yellow: 'border-l-amber-500', red: 'border-l-red-500' };

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

  useEffect(() => { loadProjekte(); }, []);

  const loadProjekte = async () => {
    try {
      const [data, fi, zeiten] = await Promise.all([base44.entities.Projekt.list('-updated_date', 200), base44.entities.Firma.list('-name', 200), base44.entities.Zeiteintrag.list('-datum', 500)]);
      setProjekte(data); setFirmen(fi);
      const map = {}; zeiten.forEach((z) => { map[z.projekt_id] = (map[z.projekt_id] || 0) + (z.stunden || 0); }); setStundenMap(map);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  let filtered = projekte;
  if (statusFilter !== 'all') filtered = filtered.filter((p) => p.status === statusFilter);
  if (search) { const s = search.toLowerCase(); filtered = filtered.filter((p) => p.projekt_name?.toLowerCase().includes(s) || firmaName(p.firma_id)?.toLowerCase().includes(s)); }
  if (sortBy === 'deadline') filtered = [...filtered].sort((a, b) => (a.deadline || '9999') > (b.deadline || '9999') ? 1 : -1);
  else filtered = [...filtered].sort((a, b) => (a.updated_date || '') > (b.updated_date || '') ? -1 : 1);

  const ProjektCard = ({ projekt }) => {
    const stunden = stundenMap[projekt.id] || 0;
    const dlStatus = getDeadlineStatus(projekt);
    return (
      <Link to={`/projekte/${projekt.id}`} className={cn('block bg-white border border-border border-l-4 rounded-2xl p-4 hover:shadow-md transition-shadow min-h-[48px]', dlColors[dlStatus])}>
        <div className="flex items-start justify-between gap-2"><div className="min-w-0 flex-1"><p className="font-semibold truncate">{projekt.projekt_name}</p><p className="text-sm text-muted-foreground truncate">{firmaName(projekt.firma_id)}</p></div><StatusBadge status={projekt.status} /></div>
        <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
          <span className="bg-brand-light text-brand-dark text-xs px-2 py-0.5 rounded-full">{projekt.aktuelle_phase || 'Entwurf'}</span>
          <span>{stunden.toFixed(1)} h</span>
          {projekt.deadline && <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> {formatDate(projekt.deadline)}</span>}
        </div>
      </Link>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl md:text-3xl font-bold">Projekte</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} Projekte</p></div>
        <div className="flex gap-2">
          <div className="flex gap-1 bg-cardbg rounded-xl p-1"><button onClick={() => setView('list')} className={cn('px-3 py-2 rounded-lg min-h-[40px]', view === 'list' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}><List className="w-4 h-4" /></button><button onClick={() => setView('kanban')} className={cn('px-3 py-2 rounded-lg min-h-[40px]', view === 'kanban' ? 'bg-white shadow-sm text-brand-dark' : 'text-muted-foreground')}><LayoutGrid className="w-4 h-4" /></button></div>
          {!isAdmin && <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" /> Neu</Button>}
        </div>
      </div>
      {view === 'list' && (<>
        <div className="flex flex-col md:flex-row gap-3 mb-6">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Projekt oder Firma suchen..." className="pl-10 min-h-[48px]" /></div>
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="md:w-44 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle Status</SelectItem><SelectItem value="Anfrage">Anfrage</SelectItem><SelectItem value="Aktiv">Aktiv</SelectItem><SelectItem value="Wartend">Wartend</SelectItem><SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem></SelectContent></Select>
          <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="md:w-44 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="deadline">Nach Deadline</SelectItem><SelectItem value="aktivitaet">Nach Aktivität</SelectItem></SelectContent></Select>
        </div>
        {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div> : <div className="grid gap-3">{filtered.map((p) => <ProjektCard key={p.id} projekt={p} />)}{filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Projekte gefunden.</p>}</div>}
      </>)}
      {view === 'kanban' && (<div className="flex gap-4 overflow-x-auto pb-4">{PHASEN.map((phase) => { const phaseProjekte = filtered.filter((p) => (p.aktuelle_phase || 'Entwurf') === phase); return (<div key={phase} className="min-w-[280px] flex-1"><div className="flex items-center justify-between mb-3 px-1"><h3 className="font-semibold">{phase}</h3><span className="text-sm text-muted-foreground bg-cardbg px-2 py-0.5 rounded-full">{phaseProjekte.length}</span></div><div className="space-y-3">{phaseProjekte.map((p) => <ProjektCard key={p.id} projekt={p} />)}{phaseProjekte.length === 0 && <p className="text-muted-foreground text-sm text-center py-8">Keine Projekte</p>}</div></div>); })}</div>)}
      {showNew && <ProjektStartWizard onClose={() => setShowNew(false)} onCreated={loadProjekte} />}
    </div>
  );
}