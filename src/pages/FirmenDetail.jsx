import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Building2, Phone, Mail, Globe, MapPin, Plus, User, ChevronRight, Check } from 'lucide-react';
import FirmaModal from '@/components/FirmaModal';
import AnsprechpartnerModal from '@/components/AnsprechpartnerModal';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

const getAmpelColor = (letzterKontakt) => {
  if (!letzterKontakt) return 'bg-red-500';
  const days = Math.floor((Date.now() - new Date(letzterKontakt)) / 86400000);
  if (days < 30) return 'bg-green-500';
  if (days < 90) return 'bg-amber-500';
  return 'bg-red-500';
};

export default function FirmenDetail() {
  const { id } = useParams();
  const [firma, setFirma] = useState(null);
  const [personen, setPersonen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [telefonate, setTelefonate] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showPersonModal, setShowPersonModal] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const f = await base44.entities.Firma.get(id);
      setFirma(f);
      const [p, pr, allNotes] = await Promise.all([
        base44.entities.Ansprechpartner.filter({ firma_id: id }, '-nachname', 100),
        base44.entities.Projekt.filter({ firma_id: id }, '-updated_date', 100),
        base44.entities.Telefonnotiz.list('-datum', 500),
      ]);
      setPersonen(p); setProjekte(pr);
      const personIds = new Set(p.map((x) => x.id));
      setTelefonate(allNotes.filter((n) => n.ansprechpartner_id && personIds.has(n.ansprechpartner_id)));
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Firma...</div>;
  if (!firma) return <div className="p-8 text-center text-muted-foreground">Firma nicht gefunden.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <Link to="/kontakte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Zurück zu Kontakten</Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{firma.firmenname}</h1>
          {firma.branche && <span className="inline-block mt-1 bg-brand-light text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">{firma.branche}</span>}
          {!firma.ist_aktiv && <span className="inline-block mt-1 ml-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">Inaktiv</span>}
        </div>
        <Button variant="outline" className="min-h-[48px] shrink-0" onClick={() => setShowEdit(true)}>Bearbeiten</Button>
      </div>

      <Card className="p-5 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {firma.adresse && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> {firma.adresse}</div>}
          {firma.telefon_zentrale && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> {firma.telefon_zentrale}</div>}
          {firma.email_allgemein && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> {firma.email_allgemein}</div>}
          {firma.website && <div className="flex items-center gap-2"><Globe className="w-4 h-4 text-brand" /> {firma.website}</div>}
        </div>
        {firma.notizen && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{firma.notizen}</p>}
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><User className="w-5 h-5 text-accent" /><h2 className="font-semibold text-lg">Ansprechpartner ({personen.length})</h2></div>
          <Button size="sm" className="bg-accent hover:bg-accent-dark text-white min-h-[40px]" onClick={() => setShowPersonModal(true)}><Plus className="w-4 h-4 mr-1" /> Neue Person</Button>
        </div>
        <div className="space-y-2">
          {personen.map((p) => (
            <Link key={p.id} to={`/personen/${p.id}`} className="flex items-center justify-between gap-3 p-3 bg-cardbg rounded-xl hover:bg-brand-light transition-colors min-h-[48px]">
              <div className="flex items-center gap-3 min-w-0">
                <div className={cn('w-2.5 h-2.5 rounded-full shrink-0', getAmpelColor(p.letzter_kontakt))} />
                <div className="min-w-0"><p className="font-medium truncate">{p.vorname} {p.nachname}</p><p className="text-sm text-muted-foreground truncate">{p.rolle || '—'} {p.telefon && `· ${p.telefon}`}</p></div>
              </div>
              <div className="flex items-center gap-2 shrink-0">{p.letzter_kontakt ? <span className="text-xs text-muted-foreground">{formatDate(p.letzter_kontakt)}</span> : <span className="text-xs text-red-500">nie</span>}<ChevronRight className="w-4 h-4 text-muted-foreground" /></div>
            </Link>
          ))}
          {personen.length === 0 && <p className="text-muted-foreground text-sm py-4 text-center">Keine Ansprechpartner angelegt.</p>}
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Building2 className="w-5 h-5 text-brand" /><h2 className="font-semibold text-lg">Projekte ({projekte.length})</h2></div>
        <div className="flex flex-wrap gap-2">
          {projekte.map((p) => (
            <Link key={p.id} to={`/projekte/${p.id}`} className="inline-flex items-center gap-2 bg-cardbg hover:bg-brand-light rounded-full px-3 py-2 transition-colors">
              <span className="text-sm font-medium">{p.projekt_name}</span><StatusBadge status={p.status} />{p.phase && <span className="text-xs text-brand-dark">{p.phase}</span>}
            </Link>
          ))}
          {projekte.length === 0 && <p className="text-muted-foreground text-sm">Keine Projekte.</p>}
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4"><Phone className="w-5 h-5 text-accent" /><h2 className="font-semibold text-lg">Telefonate ({telefonate.length})</h2></div>
        <div className="space-y-2">
          {telefonate.map((n) => {
            const person = personen.find((p) => p.id === n.ansprechpartner_id);
            return (
              <div key={n.id} className={cn('p-3 rounded-xl min-h-[48px]', n.erledigt ? 'opacity-50' : 'bg-cardbg')}>
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2"><p className="text-xs text-muted-foreground">{formatDateTime(n.datum)}</p>{person && <span className="text-xs font-medium text-accent">{person.vorname} {person.nachname}</span>}</div>
                    <p className="text-sm mt-1">{n.besprochen}</p>
                    {n.naechster_schritt && <p className="text-sm font-medium text-accent mt-1">→ {n.naechster_schritt}</p>}
                  </div>
                  {n.erledigt && <Check className="w-4 h-4 text-status-abgeschlossen shrink-0" />}
                </div>
              </div>
            );
          })}
          {telefonate.length === 0 && <p className="text-muted-foreground text-sm">Keine Telefonate.</p>}
        </div>
      </Card>

      {showEdit && <FirmaModal open={showEdit} onClose={() => setShowEdit(false)} onCreated={loadData} editFirma={firma} />}
      {showPersonModal && <AnsprechpartnerModal open={showPersonModal} onClose={() => setShowPersonModal(false)} onCreated={loadData} presetFirmaId={id} />}
    </div>
  );
}