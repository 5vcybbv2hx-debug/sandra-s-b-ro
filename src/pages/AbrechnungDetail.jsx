import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ArrowLeft, Printer, CheckCircle2 } from 'lucide-react';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const statusStyle = { Entwurf: 'bg-amber-50 text-amber-600', Versendet: 'bg-blue-50 text-blue-600', Bezahlt: 'bg-green-50 text-green-600' };

export default function AbrechnungDetail() {
  const { id } = useParams();
  const [abr, setAbr] = useState(null);
  const [projekt, setProjekt] = useState(null);
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { loadData(); }, [id]);
  const loadData = async () => { try { const a = await base44.entities.Abrechnung.get(id); setAbr(a); if (a.projekt_id) setProjekt(await base44.entities.Projekt.get(a.projekt_id)); const allZ = await base44.entities.Zeiteintrag.list('-datum', 500); setEintraege(allZ.filter(z => (a.zeiteintrag_ids || []).includes(z.id))); } catch (e) { console.error(e); } finally { setLoading(false); } };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Abrechnung...</div>;
  if (!abr) return <div className="p-8 text-center text-muted-foreground">Abrechnung nicht gefunden.</div>;

  const updateStatus = async (status) => { const updates = { status }; if (status === 'Versendet' && !abr.versendet_am) updates.versendet_am = new Date().toISOString().split('T')[0]; if (status === 'Bezahlt' && !abr.bezahlt_am) updates.bezahlt_am = new Date().toISOString().split('T')[0]; const updated = await base44.entities.Abrechnung.update(abr.id, updates); setAbr(updated); toast.success('Status aktualisiert'); };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <div className="flex items-center justify-between print:hidden"><Link to="/abrechnung" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Zurück</Link><Button variant="outline" className="min-h-[48px]" onClick={() => window.print()}><Printer className="w-4 h-4 mr-1" /> Drucken</Button></div>
      <Card className="p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div><h1 className="text-2xl font-bold">{abr.rechnungsnummer || 'Rechnung'}</h1><p className="text-muted-foreground">{projekt?.projekt_name || '—'}</p>{abr.monat && <p className="text-sm text-muted-foreground">{abr.monat}</p>}</div>
          <span className={cn('text-sm font-medium px-3 py-1 rounded-full', statusStyle[abr.status] || statusStyle.Entwurf)}>{abr.status}</span>
        </div>
        <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
          <div><p className="text-muted-foreground">Zeitraum</p><p className="font-medium">{abr.von_datum ? formatDate(abr.von_datum) : '—'} – {abr.bis_datum ? formatDate(abr.bis_datum) : '—'}</p></div>
          <div><p className="text-muted-foreground">Stunden gesamt</p><p className="font-medium">{abr.stunden_gesamt?.toFixed(1) || '0'} h</p></div>
          <div><p className="text-muted-foreground">Stundensatz</p><p className="font-medium">{formatCurrency(abr.stundensatz)}</p></div>
          <div><p className="text-muted-foreground">Rechnungsdatum</p><p className="font-medium">{abr.versendet_am ? formatDate(abr.versendet_am) : '—'}</p></div>
        </div>
        <div className="space-y-2 mb-6">
          {eintraege.map(z => <div key={z.id} className="flex justify-between text-sm py-2 border-b border-border/50"><span className="text-muted-foreground">{z.datum ? formatDate(z.datum) : '—'} · {z.beschreibung || '—'}</span><span className="font-medium">{z.stunden} h</span></div>)}
        </div>
        <div className="space-y-2 ml-auto max-w-xs">
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">Netto</span><span className="font-medium">{formatCurrency(abr.betrag_netto)}</span></div>
          <div className="flex justify-between text-sm"><span className="text-muted-foreground">MwSt (19%)</span><span className="font-medium">{formatCurrency(abr.mwst)}</span></div>
          <div className="flex justify-between text-lg font-bold border-t border-border pt-2"><span>Brutto</span><span className="text-brand-dark">{formatCurrency(abr.betrag_brutto)}</span></div>
        </div>
      </Card>
      <Card className="p-5 shadow-sm print:hidden">
        <div className="flex items-center gap-3 flex-wrap">
          <Select value={abr.status} onValueChange={updateStatus}><SelectTrigger className="w-40 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Entwurf">Entwurf</SelectItem><SelectItem value="Versendet">Versendet</SelectItem><SelectItem value="Bezahlt">Bezahlt</SelectItem></SelectContent></Select>
          {abr.status !== 'Bezahlt' && <Button className="bg-status-abgeschlossen hover:bg-green-600 text-white min-h-[48px]" onClick={() => updateStatus('Bezahlt')}><CheckCircle2 className="w-4 h-4 mr-1" /> Als bezahlt markieren</Button>}
        </div>
        {abr.notizen && <p className="text-sm text-muted-foreground mt-3">{abr.notizen}</p>}
      </Card>
    </div>
  );
}