import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Phone, Mail, Building2, Edit2, Check, MessageSquare } from 'lucide-react';
import AnsprechpartnerModal from '@/components/AnsprechpartnerModal';
import PhoneModal from '@/components/PhoneModal';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function PersonDetail() {
  const { id } = useParams();
  const [person, setPerson] = useState(null);
  const [firma, setFirma] = useState(null);
  const [telefonate, setTelefonate] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showEdit, setShowEdit] = useState(false);
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const p = await base44.entities.Ansprechpartner.get(id);
      setPerson(p);
      const [allProjekte, notes] = await Promise.all([
        base44.entities.Projekt.list('-updated_date', 200),
        base44.entities.Telefonnotiz.filter({ ansprechpartner_id: id }, '-datum', 100),
      ]);
      if (p.firma_id) { try { setFirma(await base44.entities.Firma.get(p.firma_id)); } catch { setFirma(null); } }
      else setFirma(null);
      setTelefonate(notes);
      const personProjekte = allProjekte.filter((pr) => pr.hauptansprechpartner_id === id || pr.ansprechpartner_id === id || (p.firma_id && pr.firma_id === p.firma_id));
      setProjekte(personProjekte);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Person...</div>;
  if (!person) return <div className="p-8 text-center text-muted-foreground">Person nicht gefunden.</div>;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <Link to="/kontakte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Zurück zu Kontakten</Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{person.vorname} {person.nachname}</h1>
          {person.rolle && <p className="text-muted-foreground">{person.rolle}</p>}
          {firma ? (<Link to={`/firmen/${firma.id}`} className="inline-flex items-center gap-1 mt-1 text-sm text-brand hover:underline"><Building2 className="w-3.5 h-3.5" /> {firma.firmenname}</Link>) : (<span className="inline-block mt-1 bg-gray-100 text-gray-500 text-xs font-medium px-2.5 py-1 rounded-full">Privatperson</span>)}
        </div>
        <div className="flex gap-2 shrink-0">
          <Button className="bg-accent hover:bg-accent-dark text-white min-h-[48px]" onClick={() => setShowPhone(true)}><Phone className="w-4 h-4 mr-1" /> Telefonat</Button>
          <Button variant="outline" className="min-h-[48px]" onClick={() => setShowEdit(true)}><Edit2 className="w-4 h-4" /></Button>
        </div>
      </div>

      <Card className="p-5 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {person.telefon && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> {person.telefon}</div>}
          {person.mobil && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-accent" /> {person.mobil}</div>}
          {person.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> {person.email}</div>}
          {person.bevorzugter_kontaktweg && <div className="flex items-center gap-2"><MessageSquare className="w-4 h-4 text-brand" /> Bevorzugt: {person.bevorzugter_kontaktweg}</div>}
          {person.letzter_kontakt && <div className="flex items-center gap-2"><Check className="w-4 h-4 text-status-abgeschlossen" /> Letzter Kontakt: {formatDate(person.letzter_kontakt)}</div>}
        </div>
        {person.notizen && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{person.notizen}</p>}
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
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><Phone className="w-5 h-5 text-accent" /><h2 className="font-semibold text-lg">Telefonate ({telefonate.length})</h2></div>
          <Button size="sm" className="bg-accent hover:bg-accent-dark text-white min-h-[40px]" onClick={() => setShowPhone(true)}><Phone className="w-4 h-4 mr-1" /> Erfassen</Button>
        </div>
        <div className="space-y-2">
          {telefonate.map((n) => (
            <div key={n.id} className={cn('p-3 rounded-xl min-h-[48px]', n.erledigt ? 'opacity-50' : 'bg-cardbg')}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0"><p className="text-xs text-muted-foreground">{formatDateTime(n.datum)}</p><p className="text-sm mt-1">{n.besprochen}</p>{n.naechster_schritt && <p className="text-sm font-medium text-accent mt-1">→ {n.naechster_schritt}</p>}</div>
                {n.erledigt && <Check className="w-4 h-4 text-status-abgeschlossen shrink-0" />}
              </div>
            </div>
          ))}
          {telefonate.length === 0 && <p className="text-muted-foreground text-sm">Keine Telefonate.</p>}
        </div>
      </Card>

      {showEdit && <AnsprechpartnerModal open={showEdit} onClose={() => setShowEdit(false)} onCreated={loadData} editPerson={person} />}
      {showPhone && <PhoneModal open={showPhone} onOpenChange={setShowPhone} presetAnsprechpartnerId={id} />}
    </div>
  );
}