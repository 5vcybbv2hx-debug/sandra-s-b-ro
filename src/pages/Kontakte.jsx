import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Phone, Mail, Building2, ChevronRight } from 'lucide-react';
import NeuerKontaktModal from '@/components/NeuerKontaktModal';
import { formatDate } from '@/lib/format';

export default function Kontakte() {
  const [kontakte, setKontakte] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('name');
  const [showNew, setShowNew] = useState(false);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [k, p] = await Promise.all([
        base44.entities.Kontakt.list('-updated_date', 200),
        base44.entities.Projekt.list('-updated_date', 200),
      ]);
      setKontakte(k); setProjekte(p);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const offeneProjekteFor = (kid) => projekte.filter((p) => p.kontakt_id === kid && p.status !== 'Abgeschlossen' && p.status !== 'Archiviert').length;

  let filtered = kontakte;
  if (search) { const s = search.toLowerCase(); filtered = filtered.filter((k) => k.name?.toLowerCase().includes(s) || k.firma?.toLowerCase().includes(s)); }
  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => (a.name || '') > (b.name || '') ? 1 : -1);
  else if (sortBy === 'letzter_kontakt') filtered = [...filtered].sort((a, b) => (a.letzter_kontakt || '') > (b.letzter_kontakt || '') ? -1 : 1);
  else if (sortBy === 'projekte') filtered = [...filtered].sort((a, b) => offeneProjekteFor(b.id) - offeneProjekteFor(a.id));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div><h1 className="text-2xl md:text-3xl font-bold">Kontakte</h1><p className="text-muted-foreground text-sm mt-1">{filtered.length} Kontakte</p></div>
        <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px]" onClick={() => setShowNew(true)}><Plus className="w-4 h-4 mr-1" /> Neuer Kontakt</Button>
      </div>
      <div className="flex flex-col md:flex-row gap-3 mb-6">
        <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name oder Firma suchen..." className="pl-10 min-h-[48px]" /></div>
        <Select value={sortBy} onValueChange={setSortBy}><SelectTrigger className="md:w-56 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="name">Nach Name</SelectItem><SelectItem value="letzter_kontakt">Nach letztem Kontakt</SelectItem><SelectItem value="projekte">Nach offenen Projekten</SelectItem></SelectContent></Select>
      </div>
      {loading ? (<div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div>) : (
        <div className="grid gap-3">
          {filtered.map((k) => (
            <Link key={k.id} to={`/kontakte/${k.id}`} className="block"><Card className="p-4 shadow-sm hover:shadow-md transition-shadow">
              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">{k.name}</p>
                  <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                    {k.firma && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {k.firma}</span>}
                    {k.telefon && <span className="flex items-center gap-1"><Phone className="w-3.5 h-3.5" /> {k.telefon}</span>}
                    {k.email && <span className="flex items-center gap-1"><Mail className="w-3.5 h-3.5" /> {k.email}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  {offeneProjekteFor(k.id) > 0 && <span className="bg-brand-light text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">{offeneProjekteFor(k.id)} offen</span>}
                  {k.letzter_kontakt && <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(k.letzter_kontakt)}</span>}
                  <ChevronRight className="w-4 h-4 text-muted-foreground" />
                </div>
              </div>
            </Card></Link>
          ))}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Kontakte gefunden.</p>}
        </div>
      )}
      {showNew && <NeuerKontaktModal open={showNew} onClose={() => setShowNew(false)} onCreated={loadData} />}
    </div>
  );
}