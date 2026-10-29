import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { getKmSatz } from '@/lib/settings';
import ProjektZeiten from '@/components/projekt/ProjektZeiten';
import ProjektFahrten from '@/components/projekt/ProjektFahrten';
import ProjektKosten from '@/components/projekt/ProjektKosten';
import ProjektAbrechnung from '@/components/projekt/ProjektAbrechnung';

export default function ProjektZeitGeld({ projekt, onUpdate }) {
  const [zeiten, setZeiten] = useState([]);
  const [fahrten, setFahrten] = useState([]);
  const [mitarbeiter, setMitarbeiter] = useState([]);
  const [loading, setLoading] = useState(true);
  const [kmSatz, setKmSatz] = useState(getKmSatz());

  useEffect(() => { load(); }, [projekt.id]);

  const load = async () => {
    try {
      const [z, f, m] = await Promise.all([
        base44.entities.Zeiteintrag.filter({ projekt_id: projekt.id }, '-datum', 500),
        base44.entities.Fahrt.filter({ projekt_id: projekt.id }, '-datum', 500),
        base44.entities.Mitarbeiter.list('-name', 200),
      ]);
      setZeiten(z);
      setFahrten(f);
      setMitarbeiter(m);
      setKmSatz(getKmSatz());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const reload = () => {
    load();
    onUpdate?.();
  };

  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <h3 className="font-semibold">Zeiten</h3>
        <ProjektZeiten
          projekt={projekt}
          zeiten={zeiten}
          mitarbeiter={mitarbeiter}
          loading={loading}
          reload={reload}
        />
      </section>

      <div className="border-t border-border" />

      <section className="space-y-4">
        <h3 className="font-semibold">Fahrten</h3>
        <ProjektFahrten fahrten={fahrten} mitarbeiter={mitarbeiter} kmSatz={kmSatz} />
      </section>

      <div className="border-t border-border" />

      <section className="space-y-4">
        <h3 className="font-semibold">Kosten</h3>
        <ProjektKosten
          projekt={projekt}
          zeiten={zeiten}
          fahrten={fahrten}
          mitarbeiter={mitarbeiter}
          kmSatz={kmSatz}
        />
      </section>

      <div className="border-t border-border" />

      <ProjektAbrechnung projekt={projekt} onUpdate={onUpdate} />
    </div>
  );
}