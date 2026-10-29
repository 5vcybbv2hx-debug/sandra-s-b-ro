import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Car, Printer } from 'lucide-react';
import { formatDate } from '@/lib/format';
import QuickDriveModal from '@/components/QuickDriveModal';
import DruckauftragFormModal from '@/components/druckauftraege/DruckauftragFormModal';

export default function ProjektAktivitaetErfassung({ projekt }) {
  const [fahrten, setFahrten] = useState([]);
  const [druckauftraege, setDruckauftraege] = useState([]);
  const [showFahrt, setShowFahrt] = useState(false);
  const [showDruck, setShowDruck] = useState(false);
  const [projekte, setProjekte] = useState([]);

  useEffect(() => {
    loadAll();
  }, [projekt.id]);

  const loadAll = async () => {
    const [f, d] = await Promise.all([
      base44.entities.Fahrt.filter({ projekt_id: projekt.id }, '-datum', 5),
      base44.entities.Druckauftrag.filter({ projekt_id: projekt.id }, '-datum', 5),
    ]);
    setFahrten(f);
    setDruckauftraege(d);
  };

  const openDruck = async () => {
    setShowDruck(true);
    if (projekte.length === 0) {
      const list = await base44.entities.Projekt.list('-updated_date', 300);
      setProjekte(list);
    }
  };

  const eintraege = [
    ...fahrten.map(f => ({
      id: `f-${f.id}`,
      typ: 'Fahrt',
      datum: f.datum,
      text: `${f.startort} → ${f.zielort}`,
      meta: `${f.kilometer || 0} km`,
    })),
    ...druckauftraege.map(d => ({
      id: `d-${d.id}`,
      typ: 'Druck',
      datum: d.datum,
      text: `${d.art} · ${d.format} · ${d.exemplare || 1} Ex.`,
      meta: d.status,
    })),
  ].sort((a, b) => (b.datum || '').localeCompare(a.datum || '')).slice(0, 6);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h3 className="font-semibold text-sm md:text-base mr-auto">Fahrten & Druck</h3>
        <Button variant="outline" onClick={() => setShowFahrt(true)} className="min-h-[44px] gap-2">
          <Car className="w-4 h-4" /> Fahrt erfassen
        </Button>
        <Button variant="outline" onClick={openDruck} className="min-h-[44px] gap-2">
          <Printer className="w-4 h-4" /> Druckauftrag
        </Button>
      </div>

      {eintraege.length === 0 ? (
        <p className="text-sm text-muted-foreground">Noch keine Fahrten oder Druckaufträge erfasst.</p>
      ) : (
        <div className="divide-y divide-border rounded-2xl bg-cardbg">
          {eintraege.map(e => (
            <div key={e.id} className="flex items-center gap-3 px-4 py-3">
              {e.typ === 'Fahrt'
                ? <Car className="w-4 h-4 text-accent shrink-0" />
                : <Printer className="w-4 h-4 text-brand shrink-0" />}
              <div className="min-w-0 flex-1">
                <p className="text-sm truncate">{e.text}</p>
                <p className="text-xs text-muted-foreground">{formatDate(e.datum)} · {e.meta}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      {showFahrt && (
        <QuickDriveModal
          open
          onOpenChange={(o) => { if (!o) setShowFahrt(false); }}
          defaultProjektId={projekt.id}
          onSaved={loadAll}
        />
      )}

      {showDruck && (
        <DruckauftragFormModal
          onClose={() => setShowDruck(false)}
          onSaved={loadAll}
          projekte={projekte}
          defaultProjektId={projekt.id}
        />
      )}
    </div>
  );
}