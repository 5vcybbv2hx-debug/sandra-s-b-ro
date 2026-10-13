import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import FragebogenForm from '@/components/personal/FragebogenForm';
import FragebogenListe from '@/components/personal/FragebogenListe';
import { CheckCircle2 } from 'lucide-react';

export default function Personalfragebogen() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [initial, setInitial] = useState(null);
  const [loading, setLoading] = useState(!isAdmin);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isAdmin || !user) return;
    base44.entities.Personalfragebogen.filter({}, { sort: '-updated_date', limit: 1 }).then((p) => {
      setInitial(p.items[0] || {});
      setDone(p.items[0]?.status === 'Eingereicht');
      setLoading(false);
    });
  }, [isAdmin, user]);

  if (isAdmin) {
    return (
      <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
        <div>
          <h1 className="text-2xl font-bold">Personalfragebögen</h1>
          <p className="text-sm text-muted-foreground">Als PDF herunterladen und an den Steuerberater weitergeben.</p>
        </div>
        <FragebogenListe />
      </div>
    );
  }

  if (loading) return <p className="p-8 text-center text-muted-foreground">Lade...</p>;

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Personalfragebogen Minijob</h1>
        <p className="text-sm text-muted-foreground">Bitte einmalig ausfüllen – die Angaben gehen an die Lohnabrechnung.</p>
      </div>
      {done && (
        <div className="flex items-center gap-2 rounded-lg bg-brand-light text-brand-dark p-3 text-sm">
          <CheckCircle2 className="w-5 h-5" /> Bereits abgeschickt. Du kannst Angaben bei Änderungen hier aktualisieren.
        </div>
      )}
      <FragebogenForm initial={initial} user={user} onSaved={(submitted) => { if (submitted) navigate('/'); }} />
    </div>
  );
}