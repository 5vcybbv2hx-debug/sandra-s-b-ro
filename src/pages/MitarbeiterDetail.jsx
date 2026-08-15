import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Mail, Calendar, Euro, Edit, UserPlus, Loader2, CheckCircle2 } from 'lucide-react';
import { formatDate, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import MitarbeiterFormModal from '@/components/mitarbeiter/MitarbeiterFormModal';
import { toast } from 'sonner';

export default function MitarbeiterDetail() {
  const { id } = useParams();
  const [m, setM] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [inviting, setInviting] = useState(false);
  const [invited, setInvited] = useState(false);

  useEffect(() => { load(); }, [id]);

  const load = async () => {
    try { setM(await base44.entities.Mitarbeiter.get(id)); }
    catch { toast.error('Mitarbeiter nicht gefunden'); }
    finally { setLoading(false); }
  };

  const handleInvite = async () => {
    if (!m.email) { toast.error('Keine E-Mail hinterlegt — bitte erst E-Mail eintragen.'); return; }
    setInviting(true);
    try {
      await base44.users.inviteUser(m.email, 'user');
      setInvited(true);
      toast.success(`Einladung an ${m.name} gesendet`);
    } catch (err) {
      const reason = err?.message || err?.error || 'Unbekannter Fehler';
      toast.error(`Einladung fehlgeschlagen: ${reason}`);
    } finally {
      setInviting(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade...</div>;
  if (!m) return <div className="p-8 text-center text-muted-foreground">Nicht gefunden.</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <Link to="/mitarbeiter" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Mitarbeitern
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{m.name}</h1>
          <p className="text-muted-foreground">{m.rolle || '—'}</p>
        </div>
        <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full shrink-0', m.status === 'Aktiv' ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500')}>
          {m.status}
        </span>
      </div>

      {/* App-Einladung */}
      {m.email && (
        <Card className="p-5">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-medium">App-Zugang</p>
              <p className="text-sm text-muted-foreground">
                {invited
                  ? 'Einladung wurde gesendet. Mitarbeiter kann sich registrieren.'
                  : 'Mitarbeiter per E-Mail zur App einladen.'}
              </p>
            </div>
            {invited ? (
              <div className="flex items-center gap-2 text-emerald-600 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
                <span className="text-sm font-medium">Eingeladen</span>
              </div>
            ) : (
              <Button
                onClick={handleInvite}
                disabled={inviting}
                className="gap-2 shrink-0"
              >
                {inviting
                  ? <Loader2 className="w-4 h-4 animate-spin" />
                  : <UserPlus className="w-4 h-4" />}
                {inviting ? 'Senden...' : 'Einladen'}
              </Button>
            )}
          </div>
        </Card>
      )}

      <div className="grid sm:grid-cols-2 gap-4">
        {m.telefon && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0"><Phone className="w-5 h-5 text-brand" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">Telefon</p><p className="font-medium">{m.telefon}</p></div>
            </div>
          </Card>
        )}
        {m.email && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0"><Mail className="w-5 h-5 text-brand" /></div>
              <div className="min-w-0"><p className="text-xs text-muted-foreground">E-Mail</p><p className="font-medium truncate">{m.email}</p></div>
            </div>
          </Card>
        )}
        {m.eintrittsdatum && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-brand" /></div>
              <div><p className="text-xs text-muted-foreground">Eintritt</p><p className="font-medium">{formatDate(m.eintrittsdatum)}</p></div>
            </div>
          </Card>
        )}
        {m.austrittsdatum && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0"><Calendar className="w-5 h-5 text-accent" /></div>
              <div><p className="text-xs text-muted-foreground">Austritt</p><p className="font-medium">{formatDate(m.austrittsdatum)}</p></div>
            </div>
          </Card>
        )}
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0"><Euro className="w-5 h-5 text-brand" /></div>
            <div><p className="text-xs text-muted-foreground">Stundensatz</p><p className="font-medium">{formatCurrency(m.stundensatz)}</p></div>
          </div>
        </Card>
      </div>

      {m.notizen && (
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-2">Notizen</p>
          <p className="text-sm whitespace-pre-wrap">{m.notizen}</p>
        </Card>
      )}

      <div className="flex justify-end gap-2">
        {!m.email && (
          <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
            <Edit className="w-4 h-4" /> E-Mail hinterlegen
          </Button>
        )}
        <Button variant="outline" onClick={() => setEditOpen(true)} className="gap-2">
          <Edit className="w-4 h-4" /> Bearbeiten
        </Button>
      </div>

      {editOpen && <MitarbeiterFormModal onClose={() => setEditOpen(false)} onSaved={load} editItem={m} />}
    </div>
  );
}
