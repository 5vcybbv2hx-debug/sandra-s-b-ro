import { useParams, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft } from 'lucide-react';
import StatusBadge from '@/components/StatusBadge';
import ProjektUebersicht from '@/components/projekt/ProjektUebersicht';
import ProjektZeiten from '@/components/projekt/ProjektZeiten';
import ProjektAufgaben from '@/components/projekt/ProjektAufgaben';
import ProjektTelefonate from '@/components/projekt/ProjektTelefonate';
import ProjektAbrechnung from '@/components/projekt/ProjektAbrechnung';

export default function ProjektDetail() {
  const { id } = useParams();
  const [projekt, setProjekt] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjekt();
  }, [id]);

  const loadProjekt = async () => {
    try {
      const p = await base44.entities.Projekt.get(id);
      setProjekt(p);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Projekt...</div>;
  if (!projekt) return <div className="p-8 text-center text-muted-foreground">Projekt nicht gefunden.</div>;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto">
      <Link
        to="/projekte"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Zurück zu Projekten
      </Link>
      <div className="flex items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold truncate">{projekt.projekt_name}</h1>
          <p className="text-muted-foreground">
            {projekt.kunde_name}
            {projekt.kunde_firma && ` · ${projekt.kunde_firma}`}
          </p>
        </div>
        <StatusBadge status={projekt.status} />
      </div>

      <Tabs defaultValue="uebersicht">
        <TabsList className="w-full justify-start overflow-x-auto mb-6 h-auto">
          <TabsTrigger value="uebersicht" className="min-h-[40px]">Übersicht</TabsTrigger>
          <TabsTrigger value="zeiten" className="min-h-[40px]">Zeiten</TabsTrigger>
          <TabsTrigger value="aufgaben" className="min-h-[40px]">Aufgaben</TabsTrigger>
          <TabsTrigger value="telefone" className="min-h-[40px]">Telefonate</TabsTrigger>
          <TabsTrigger value="abrechnung" className="min-h-[40px]">Abrechnung</TabsTrigger>
        </TabsList>
        <TabsContent value="uebersicht">
          <ProjektUebersicht projekt={projekt} onUpdate={loadProjekt} />
        </TabsContent>
        <TabsContent value="zeiten">
          <ProjektZeiten projekt={projekt} />
        </TabsContent>
        <TabsContent value="aufgaben">
          <ProjektAufgaben projekt={projekt} />
        </TabsContent>
        <TabsContent value="telefone">
          <ProjektTelefonate projekt={projekt} />
        </TabsContent>
        <TabsContent value="abrechnung">
          <ProjektAbrechnung projekt={projekt} onUpdate={loadProjekt} />
        </TabsContent>
      </Tabs>
    </div>
  );
}