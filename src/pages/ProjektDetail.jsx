import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Building2, User, Check, CheckCircle2 } from 'lucide-react';
import ProjektPhasen from '@/components/projekt/ProjektPhasen';
import ProjektDokumente from '@/components/projekt/ProjektDokumente';
import ProjektZeitGeld from '@/components/projekt/ProjektZeitGeld';
import ProjektAktivitaet from '@/components/projekt/ProjektAktivitaet';
import StatusBadge from '@/components/StatusBadge';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PHASEN = ['Entwurf', 'Baugesuch', 'Werkplanung'];

export default function ProjektDetail() {
  const { id } = useParams();
  const [projekt, setProjekt] = useState(null);
  const [firma, setFirma] = useState(null);
  const [ansprechpartner, setAnsprechpartner] = useState(null);
  const [zeiten, setZeiten] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadProjekt(); }, [id]);

  const loadProjekt = async () => {
    try {
      const p = await base44.entities.Projekt.get(id);
      setProjekt(p);
      if (p.firma_id) { try { setFirma(await base44.entities.Firma.get(p.firma_id)); } catch {} }
      if (p.haupt_ansprechpartner_id) { try { setAnsprechpartner(await base44.entities.Ansprechpartner.get(p.haupt_ansprechpartner_id)); } catch {} }
      const z = await base44.entities.Zeiteintrag.filter({ projekt_id: id }, '-datum', 500);
      setZeiten(z.filter((x) => !x.timer_laeuft));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Projekt...</div>;
  if (!projekt) return <div className="p-8 text-center text-muted-foreground">Projekt nicht gefunden.</div>;

  const aktuellePhaseIndex = PHASEN.indexOf(projekt.aktuelle_phase || 'Entwurf');
  const gesamtStunden = zeiten.reduce((s, z) => s + (z.stunden || 0), 0);
  const abrechnungBetrag = projekt.abrechnungsart === 'Pauschal' ? projekt.pauschalbetrag : gesamtStunden * (projekt.stundensatz || 0);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <Link to="/projekte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Zurück zu Projekten</Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{projekt.projekt_name}</h1>
          <div className="flex items-center gap-3 mt-1 flex-wrap">
            {firma && <Link to={`/firmen/${firma.id}`} className="inline-flex items-center gap-1 text-sm text-brand hover:underline"><Building2 className="w-3.5 h-3.5" /> {firma.name}</Link>}
          </div>
        </div>
        <StatusBadge status={projekt.status} />
      </div>

      <div className="flex flex-col sm:flex-row gap-3 text-sm py-1">
        <div className="flex flex-wrap gap-x-5 gap-y-1 items-center">
          <span className="text-muted-foreground">Stundensatz: <span className="font-medium text-foreground">{projekt.stundensatz ? `${projekt.stundensatz} €/h` : '—'}</span></span>
          <span className="text-muted-foreground">Abrechnung: <span className="font-medium text-foreground">{projekt.abrechnungsart}</span></span>
          {projekt.abrechnungsart === 'Pauschal' && <span className="text-muted-foreground">Pauschalbetrag: <span className="font-medium text-foreground">{projekt.pauschalbetrag ? `${projekt.pauschalbetrag} €` : '—'}</span></span>}
        </div>
        {ansprechpartner && (
          <div className="sm:ml-auto flex flex-wrap gap-x-4 gap-y-1 items-center">
            <Link to={`/personen/${ansprechpartner.id}`} className="inline-flex items-center gap-1 text-accent hover:underline font-medium"><User className="w-3.5 h-3.5" /> {ansprechpartner.vorname} {ansprechpartner.nachname}</Link>
            {ansprechpartner.telefon && <span className="text-muted-foreground">{ansprechpartner.telefon}</span>}
            {ansprechpartner.email && <span className="text-muted-foreground">{ansprechpartner.email}</span>}
          </div>
        )}
      </div>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-3"><h3 className="font-semibold">Phasen-Fortschritt</h3></div>
        <div className="flex items-center gap-1">
          {PHASEN.map((phase, i) => (
            <div key={phase} className="flex items-center flex-1">
              <div className={cn('flex items-center gap-2 px-3 py-2 rounded-xl flex-1 min-h-[40px]', i === aktuellePhaseIndex ? 'bg-brand text-white' : i < aktuellePhaseIndex ? 'bg-status-abgeschlossen text-white' : 'bg-cardbg text-muted-foreground')}>
                {i < aktuellePhaseIndex && <Check className="w-4 h-4" />}
                <span className="text-sm font-medium">{phase}</span>
              </div>
              {i < PHASEN.length - 1 && <div className={cn('w-4 h-0.5', i < aktuellePhaseIndex ? 'bg-status-abgeschlossen' : 'bg-border')} />}
            </div>
          ))}
        </div>
      </Card>

      <Tabs defaultValue="phasen" className="w-full">
        <TabsList className="grid grid-cols-4 mb-4 h-12">
          <TabsTrigger value="phasen">Phasen</TabsTrigger>
          <TabsTrigger value="dokumente">Dokumente</TabsTrigger>
          <TabsTrigger value="zeitgeld">Zeit & Geld</TabsTrigger>
          <TabsTrigger value="aktivitaet">Aktivität</TabsTrigger>
        </TabsList>
        <TabsContent value="phasen"><ProjektPhasen projekt={projekt} firma={firma} onUpdate={loadProjekt} /></TabsContent>
        <TabsContent value="dokumente"><ProjektDokumente projekt={projekt} firma={firma} /></TabsContent>
        <TabsContent value="zeitgeld"><ProjektZeitGeld projekt={projekt} onUpdate={loadProjekt} /></TabsContent>
        <TabsContent value="aktivitaet"><ProjektAktivitaet projekt={projekt} /></TabsContent>
      </Tabs>
    </div>
  );
}