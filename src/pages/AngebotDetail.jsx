import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { formatDate, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, FileText, Building2, Calendar, Euro, Clock, ExternalLink } from 'lucide-react';
import AngebotFormModal from '@/components/angebote/AngebotFormModal';

const STATUS_STYLES = {
  Entwurf: 'bg-gray-100 text-gray-700',
  Verschickt: 'bg-blue-100 text-blue-700',
  Angenommen: 'bg-emerald-100 text-emerald-700',
  Abgelehnt: 'bg-rose-100 text-rose-700',
  Archiviert: 'bg-muted text-muted-foreground',
};
const STATUSES = ['Entwurf', 'Verschickt', 'Angenommen', 'Abgelehnt', 'Archiviert'];

export default function AngebotDetail() {
  const { id } = useParams();
  const [angebot, setAngebot] = useState(null);
  const [firma, setFirma] = useState(null);
  const [projekt, setProjekt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editOpen, setEditOpen] = useState(false);

  useEffect(() => { loadAngebot(); }, [id]);

  const loadAngebot = async () => {
    try {
      const a = await base44.entities.Angebot.get(id);
      setAngebot(a);
      if (a.firma_id) try { setFirma(await base44.entities.Firma.get(a.firma_id)); } catch {}
      if (a.projekt_id) try { setProjekt(await base44.entities.Projekt.get(a.projekt_id)); } catch {}
    } catch { toast.error('Angebot nicht gefunden'); }
    finally { setLoading(false); }
  };

  const changeStatus = async (newStatus) => {
    try {
      await base44.entities.Angebot.update(id, { status: newStatus });
      setAngebot({ ...angebot, status: newStatus });
      toast.success(`Status geändert: ${newStatus}`);
    } catch { toast.error('Status konnte nicht geändert werden'); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Angebot...</div>;
  if (!angebot) return <div className="p-8 text-center text-muted-foreground">Angebot nicht gefunden.</div>;

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <Link to="/angebote" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-4 h-4" /> Zurück zu Angeboten
      </Link>

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-mono text-sm text-brand font-semibold">{angebot.nummer}</p>
          <h1 className="text-2xl md:text-3xl font-bold">{angebot.betreff}</h1>
        </div>
        <span className={cn('text-xs font-medium px-3 py-1.5 rounded-full shrink-0', STATUS_STYLES[angebot.status])}>{angebot.status}</span>
      </div>

      <Button asChild variant="outline" className="gap-2 w-fit">
        <a href={angebot.sevdesk_id ? `https://app.sevdesk.de/#/invoices/detail/${angebot.sevdesk_id}` : 'https://app.sevdesk.de/#/invoices/new'} target="_blank" rel="noopener noreferrer">
          <ExternalLink className="w-4 h-4" /> {angebot.sevdesk_id ? 'In sevdesk anzeigen' : 'In sevdesk öffnen'}
        </a>
      </Button>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-brand" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-muted-foreground">Firma</p>
              {firma ? <Link to={`/firmen/${firma.id}`} className="font-medium text-sm hover:text-brand truncate block">{firma.name}</Link> : <p className="text-sm">—</p>}
            </div>
          </div>
        </Card>
        {projekt && (
          <Card className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-accent" />
              </div>
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">Projekt</p>
                <Link to={`/projekte/${projekt.id}`} className="font-medium text-sm hover:text-brand truncate block">{projekt.projekt_name}</Link>
              </div>
            </div>
          </Card>
        )}
      </div>

      <Card className="p-5 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm"><Calendar className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Datum:</span> <span className="font-medium">{formatDate(angebot.datum)}</span></div>
          <div className="flex items-center gap-2 text-sm"><Clock className="w-4 h-4 text-muted-foreground" /> <span className="text-muted-foreground">Gültig bis:</span> <span className="font-medium">{formatDate(angebot.gueltig_bis)}</span></div>
        </div>
        <div className="grid grid-cols-2 gap-4 pt-3 border-t border-border/60">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Netto</p>
            <p className="text-xl font-bold">{formatCurrency(angebot.betrag_netto)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Brutto</p>
            <p className="text-xl font-bold text-brand">{formatCurrency(angebot.betrag_brutto)}</p>
          </div>
        </div>
      </Card>

      {angebot.pdf_url && (
        <Card className="p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FileText className="w-8 h-8 text-brand" />
              <div>
                <p className="font-medium text-sm">Angebot als PDF</p>
                <p className="text-xs text-muted-foreground">Klicken zum Öffnen</p>
              </div>
            </div>
            <Button variant="outline" asChild>
              <a href={angebot.pdf_url} target="_blank" rel="noopener noreferrer" className="gap-2">
                <ExternalLink className="w-4 h-4" /> Öffnen
              </a>
            </Button>
          </div>
        </Card>
      )}

      {angebot.notizen && (
        <Card className="p-5">
          <p className="text-xs text-muted-foreground mb-2">Notizen</p>
          <p className="text-sm whitespace-pre-wrap">{angebot.notizen}</p>
        </Card>
      )}

      <Card className="p-5">
        <p className="text-sm font-semibold mb-3">Status ändern</p>
        <div className="flex flex-wrap gap-2">
          {STATUSES.map(s => (
            <Button key={s} variant={angebot.status === s ? 'default' : 'outline'} size="sm" onClick={() => changeStatus(s)} disabled={angebot.status === s}
              className={angebot.status === s ? 'bg-brand text-white' : ''}>
              {s}
            </Button>
          ))}
        </div>
      </Card>

      <div className="flex justify-end">
        <Button variant="outline" onClick={() => setEditOpen(true)}>Bearbeiten</Button>
      </div>

      <AngebotFormModal open={editOpen} onClose={() => setEditOpen(false)} onSaved={loadAngebot} editAngebot={angebot} firmen={firma ? [firma] : []} projekte={projekt ? [projekt] : []} />
    </div>
  );
}