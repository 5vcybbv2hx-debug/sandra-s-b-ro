import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Building2, User, ChevronRight, Phone, Mail, ChevronDown } from 'lucide-react';
import FirmaModal from '@/components/FirmaModal';
import AnsprechpartnerModal from '@/components/AnsprechpartnerModal';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const getAmpelColor = (d) => {
  if (!d) return 'bg-red-500';
  const days = Math.floor((Date.now() - new Date(d)) / 86400000);
  return days < 30 ? 'bg-green-500' : days < 90 ? 'bg-amber-500' : 'bg-red-500';
};

const isOverdue = (p) => {
  if (!p.letzter_kontakt) return true;
  return Math.floor((Date.now() - new Date(p.letzter_kontakt)) / 86400000) > 90;
};

const FILTER_PILLS = [
  { id: 'all', label: 'Alle', dot: null },
  { id: 'overdue', label: 'Kontakt überfällig', dot: 'bg-red-500' },
  { id: 'never', label: 'Nie kontaktiert', dot: 'bg-amber-500' },
];

export default function Kontakte() {
  const [firmen, setFirmen] = useState([]);
  const [personen, setPersonen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFirma, setSearchFirma] = useState('');
  const [searchPerson, setSearchPerson] = useState('');
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);
  const [personFilter, setPersonFilter] = useState('all');
  const [collapsedFirmen, setCollapsedFirmen] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    try {
      const [f, p, pr] = await Promise.all([
        base44.entities.Firma.list('-name', 200),
        base44.entities.Ansprechpartner.list('-nachname', 200),
        base44.entities.Projekt.list('-updated_date', 200),
      ]);
      setFirmen(f); setPersonen(p); setProjekte(pr);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const apCount = (fid) => personen.filter((p) => p.firma_id === fid).length;
  const activeProjekte = (fid) => projekte.filter((p) => p.firma_id === fid && p.status !== 'Abgeschlossen' && p.status !== 'Archiviert').length;
  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  const getHauptansprechpartner = (firmaId) => {
    const projekt = projekte.find((p) => p.firma_id === firmaId && p.haupt_ansprechpartner_id);
    if (projekt) {
      const ap = personen.find((p) => p.id === projekt.haupt_ansprechpartner_id);
      if (ap) return ap;
    }
    return personen.find((p) => p.firma_id === firmaId);
  };

  let ff = firmen;
  if (searchFirma) {
    const s = searchFirma.toLowerCase();
    ff = firmen.filter((f) => f.name?.toLowerCase().includes(s) || f.branche?.toLowerCase().includes(s));
  }

  let pf = personen;
  if (searchPerson) {
    const s = searchPerson.toLowerCase();
    pf = pf.filter((p) => `${p.vorname} ${p.nachname}`.toLowerCase().includes(s));
  }
  if (personFilter === 'overdue') pf = pf.filter(isOverdue);
  if (personFilter === 'never') pf = pf.filter((p) => !p.letzter_kontakt);

  const personGroupMap = {};
  pf.forEach((p) => {
    const key = p.firma_id || 'none';
    if (!personGroupMap[key]) {
      personGroupMap[key] = { key, name: p.firma_id ? firmaName(p.firma_id) : 'Ohne Firma', items: [] };
    }
    personGroupMap[key].items.push(p);
  });
  const personGroups = Object.values(personGroupMap);

  const toggleFirmaGroup = (key) => setCollapsedFirmen((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-bold">Kontakte</h1>
        <p className="text-muted-foreground text-sm mt-1">{firmen.length} Firmen · {personen.length} Personen</p>
      </div>
      <Tabs defaultValue="firmen" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12">
          <TabsTrigger value="firmen" className="min-h-[40px]"><Building2 className="w-4 h-4 mr-2" /> Firmen</TabsTrigger>
          <TabsTrigger value="personen" className="min-h-[40px]"><User className="w-4 h-4 mr-2" /> Personen</TabsTrigger>
        </TabsList>

        <TabsContent value="firmen" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchFirma} onChange={(e) => setSearchFirma(e.target.value)} placeholder="Firma oder Branche suchen..." className="pl-10 min-h-[48px]" />
            </div>
            <Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px] shrink-0" onClick={() => setShowFirmaModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Neue Firma
            </Button>
          </div>
          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div>
          ) : (
            <div className="grid gap-3">
              {ff.map((f) => {
                const hauptAp = getHauptansprechpartner(f.id);
                return (
                  <Link key={f.id} to={`/firmen/${f.id}`} className="block">
                    <Card className={cn('p-4 shadow-sm hover:shadow-md transition-shadow border-l-4', f.aktiv !== false ? 'border-l-brand' : 'border-l-gray-300 opacity-60')}>
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold truncate">{f.name}</p>
                          <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                            {f.branche && <span className="bg-brand-light text-brand-dark text-xs px-2 py-0.5 rounded-full">{f.branche}</span>}
                            <span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {apCount(f.id)}</span>
                            {activeProjekte(f.id) > 0 && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {activeProjekte(f.id)} aktiv</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.preventDefault()}>
                          {hauptAp?.telefon && (
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `tel:${hauptAp.telefon}`; }} className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white transition-colors">
                              <Phone className="w-3.5 h-3.5" />
                            </button>
                          )}
                          {hauptAp?.email && (
                            <button onClick={(e) => { e.stopPropagation(); e.preventDefault(); window.location.href = `mailto:${hauptAp.email}`; }} className="w-8 h-8 flex items-center justify-center rounded-full bg-brand-light text-brand-dark hover:bg-brand hover:text-white transition-colors">
                              <Mail className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <ChevronRight className="w-4 h-4 text-muted-foreground" />
                        </div>
                      </div>
                    </Card>
                  </Link>
                );
              })}
              {ff.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Firmen gefunden.</p>}
            </div>
          )}
        </TabsContent>

        <TabsContent value="personen" className="space-y-4">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input value={searchPerson} onChange={(e) => setSearchPerson(e.target.value)} placeholder="Name suchen..." className="pl-10 min-h-[48px]" />
            </div>
            <Button className="bg-accent hover:bg-accent-dark text-white min-h-[48px] shrink-0" onClick={() => setShowPersonModal(true)}>
              <Plus className="w-4 h-4 mr-1" /> Neue Person
            </Button>
          </div>

          <div className="flex gap-2 flex-wrap">
            {FILTER_PILLS.map((pill) => (
              <button
                key={pill.id}
                onClick={() => setPersonFilter(pill.id)}
                className={cn(
                  'flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium transition-colors min-h-[36px]',
                  personFilter === pill.id ? 'bg-brand text-white' : 'bg-cardbg text-muted-foreground hover:bg-muted'
                )}
              >
                {pill.dot && <span className={cn('w-2 h-2 rounded-full', pill.dot)} />}
                {pill.label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div>
          ) : personGroups.length === 0 ? (
            <p className="text-muted-foreground text-center py-12">Keine Personen gefunden.</p>
          ) : (
            <div className="space-y-4">
              {personGroups.map((group) => {
                const isCollapsed = collapsedFirmen[group.key];
                return (
                  <div key={group.key}>
                    <button
                      onClick={() => toggleFirmaGroup(group.key)}
                      className="flex items-center gap-2 w-full px-1 py-2 text-sm font-semibold text-foreground"
                    >
                      <ChevronDown className={cn('w-4 h-4 transition-transform duration-200', isCollapsed && 'rotate-180')} />
                      {group.name}
                      <span className="text-xs font-normal text-muted-foreground bg-cardbg px-2 py-0.5 rounded-full">{group.items.length}</span>
                    </button>
                    <div className={cn('overflow-hidden transition-all duration-200', isCollapsed ? 'max-h-0' : 'max-h-[5000px]')}>
                      <div className="grid gap-3 pt-1">
                        {group.items.map((p) => {
                          const hasFirma = !!p.firma_id;
                          return (
                            <Link key={p.id} to={`/personen/${p.id}`} className="block">
                              <Card className={cn('p-4 shadow-sm hover:shadow-md transition-shadow border-l-4', hasFirma ? 'border-l-accent' : 'border-l-gray-300')}>
                                <div className="flex items-center justify-between gap-3">
                                  <div className="min-w-0 flex-1">
                                    <p className="font-semibold truncate">{p.vorname} {p.nachname}</p>
                                    <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">
                                      {p.rolle && <span>{p.rolle}</span>}
                                      <span className={cn('font-medium', hasFirma ? 'text-foreground' : 'text-muted-foreground')}>{hasFirma ? firmaName(p.firma_id) : 'Privatperson'}</span>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-3 shrink-0">
                                    <div className="flex items-center gap-1.5">
                                      <div className={cn('w-2.5 h-2.5 rounded-full', getAmpelColor(p.letzter_kontakt))} />
                                      {p.letzter_kontakt ? <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(p.letzter_kontakt)}</span> : <span className="text-xs text-red-500">nie</span>}
                                    </div>
                                    {p.telefon && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}
                                    <ChevronRight className="w-4 h-4 text-muted-foreground" />
                                  </div>
                                </div>
                              </Card>
                            </Link>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
      {showFirmaModal && <FirmaModal open={showFirmaModal} onClose={() => setShowFirmaModal(false)} onCreated={loadData} />}
      {showPersonModal && <AnsprechpartnerModal open={showPersonModal} onClose={() => setShowPersonModal(false)} onCreated={loadData} />}
    </div>
  );
}