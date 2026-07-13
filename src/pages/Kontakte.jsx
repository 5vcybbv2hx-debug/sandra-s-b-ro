import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Search, Building2, User, ChevronRight, Phone } from 'lucide-react';
import FirmaModal from '@/components/FirmaModal';
import AnsprechpartnerModal from '@/components/AnsprechpartnerModal';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const getAmpelColor = (d) => { if (!d) return 'bg-red-500'; const days = Math.floor((Date.now() - new Date(d)) / 86400000); return days < 30 ? 'bg-green-500' : days < 90 ? 'bg-amber-500' : 'bg-red-500'; };

export default function Kontakte() {
  const [firmen, setFirmen] = useState([]);
  const [personen, setPersonen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchFirma, setSearchFirma] = useState('');
  const [searchPerson, setSearchPerson] = useState('');
  const [showFirmaModal, setShowFirmaModal] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { const [f, p, pr] = await Promise.all([base44.entities.Firma.list('-name', 200), base44.entities.Ansprechpartner.list('-nachname', 200), base44.entities.Projekt.list('-updated_date', 200)]); setFirmen(f); setPersonen(p); setProjekte(pr); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const apCount = (fid) => personen.filter((p) => p.firma_id === fid).length;
  const activeProjekte = (fid) => projekte.filter((p) => p.firma_id === fid && p.status !== 'Abgeschlossen' && p.status !== 'Archiviert').length;
  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  let ff = firmen; if (searchFirma) { const s = searchFirma.toLowerCase(); ff = firmen.filter((f) => f.name?.toLowerCase().includes(s) || f.branche?.toLowerCase().includes(s)); }
  let pf = personen; if (searchPerson) { const s = searchPerson.toLowerCase(); pf = personen.filter((p) => `${p.vorname} ${p.nachname}`.toLowerCase().includes(s)); }

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <div className="mb-6"><h1 className="text-2xl md:text-3xl font-bold">Kontakte</h1><p className="text-muted-foreground text-sm mt-1">{firmen.length} Firmen · {personen.length} Personen</p></div>
      <Tabs defaultValue="firmen" className="w-full">
        <TabsList className="grid w-full grid-cols-2 mb-6 h-12"><TabsTrigger value="firmen" className="min-h-[40px]"><Building2 className="w-4 h-4 mr-2" /> Firmen</TabsTrigger><TabsTrigger value="personen" className="min-h-[40px]"><User className="w-4 h-4 mr-2" /> Personen</TabsTrigger></TabsList>
        <TabsContent value="firmen" className="space-y-4">
          <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={searchFirma} onChange={(e) => setSearchFirma(e.target.value)} placeholder="Firma oder Branche suchen..." className="pl-10 min-h-[48px]" /></div><Button className="bg-brand hover:bg-brand-dark text-white min-h-[48px] shrink-0" onClick={() => setShowFirmaModal(true)}><Plus className="w-4 h-4 mr-1" /> Neue Firma</Button></div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div> : (
            <div className="grid gap-3">{ff.map((f) => (<Link key={f.id} to={`/firmen/${f.id}`} className="block"><Card className={cn('p-4 shadow-sm hover:shadow-md transition-shadow border-l-4', f.aktiv !== false ? 'border-l-brand' : 'border-l-gray-300 opacity-60')}><div className="flex items-center justify-between gap-3"><div className="min-w-0 flex-1"><p className="font-semibold truncate">{f.name}</p><div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">{f.branche && <span className="bg-brand-light text-brand-dark text-xs px-2 py-0.5 rounded-full">{f.branche}</span>}<span className="flex items-center gap-1"><User className="w-3.5 h-3.5" /> {apCount(f.id)}</span>{activeProjekte(f.id) > 0 && <span className="flex items-center gap-1"><Building2 className="w-3.5 h-3.5" /> {activeProjekte(f.id)} aktiv</span>}</div></div><ChevronRight className="w-4 h-4 text-muted-foreground shrink-0" /></div></Card></Link>))}{ff.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Firmen gefunden.</p>}</div>
          )}
        </TabsContent>
        <TabsContent value="personen" className="space-y-4">
          <div className="flex gap-3"><div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={searchPerson} onChange={(e) => setSearchPerson(e.target.value)} placeholder="Name suchen..." className="pl-10 min-h-[48px]" /></div><Button className="bg-accent hover:bg-accent-dark text-white min-h-[48px] shrink-0" onClick={() => setShowPersonModal(true)}><Plus className="w-4 h-4 mr-1" /> Neue Person</Button></div>
          {loading ? <div className="space-y-3">{[1, 2, 3].map((i) => <div key={i} className="h-20 bg-cardbg rounded-2xl animate-pulse" />)}</div> : (
            <div className="grid gap-3">{pf.map((p) => { const hasFirma = !!p.firma_id; return (<Link key={p.id} to={`/personen/${p.id}`} className="block"><Card className={cn('p-4 shadow-sm hover:shadow-md transition-shadow border-l-4', hasFirma ? 'border-l-accent' : 'border-l-gray-300')}><div className="flex items-center justify-between gap-3"><div className="min-w-0 flex-1"><p className="font-semibold truncate">{p.vorname} {p.nachname}</p><div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground flex-wrap">{p.rolle && <span>{p.rolle}</span>}<span className={cn('font-medium', hasFirma ? 'text-foreground' : 'text-muted-foreground')}>{hasFirma ? firmaName(p.firma_id) : 'Privatperson'}</span></div></div><div className="flex items-center gap-3 shrink-0"><div className="flex items-center gap-1.5"><div className={cn('w-2.5 h-2.5 rounded-full', getAmpelColor(p.letzter_kontakt))} />{p.letzter_kontakt ? <span className="text-xs text-muted-foreground hidden sm:inline">{formatDate(p.letzter_kontakt)}</span> : <span className="text-xs text-red-500">nie</span>}</div>{p.telefon && <Phone className="w-3.5 h-3.5 text-muted-foreground" />}<ChevronRight className="w-4 h-4 text-muted-foreground" /></div></div></Card></Link>); })}{pf.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Personen gefunden.</p>}</div>
          )}
        </TabsContent>
      </Tabs>
      {showFirmaModal && <FirmaModal open={showFirmaModal} onClose={() => setShowFirmaModal(false)} onCreated={loadData} />}
      {showPersonModal && <AnsprechpartnerModal open={showPersonModal} onClose={() => setShowPersonModal(false)} onCreated={loadData} />}
    </div>
  );
}