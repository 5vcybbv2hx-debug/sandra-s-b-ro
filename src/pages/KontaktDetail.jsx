import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, Mail, Building2, MapPin, Plus, Edit2, Check } from 'lucide-react';
import NeuerKontaktModal from '@/components/NeuerKontaktModal';
import StatusBadge from '@/components/StatusBadge';
import { formatDate, formatDateTime, todayISO } from '@/lib/format';
import { toast } from 'sonner';

export default function KontaktDetail() {
  const { id } = useParams();
  const [kontakt, setKontakt] = useState(null);
  const [projekte, setProjekte] = useState([]);
  const [notizen, setNotizen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editMode, setEditMode] = useState(false);
  const [phoneForm, setPhoneForm] = useState({ besprochen: '', naechster_schritt: '' });
  const [showPhone, setShowPhone] = useState(false);

  useEffect(() => { loadData(); }, [id]);

  const loadData = async () => {
    try {
      const k = await base44.entities.Kontakt.get(id);
      setKontakt(k);
      const [p, n] = await Promise.all([
        base44.entities.Projekt.filter({ kontakt_id: id }, '-updated_date', 50),
        base44.entities.Telefonnotiz.filter({ kontakt_id: id }, '-datum', 50),
      ]);
      setProjekte(p); setNotizen(n);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const savePhoneNote = async () => {
    if (!phoneForm.besprochen.trim()) return;
    try {
      await base44.entities.Telefonnotiz.create({ kontakt_id: id, kontakt_name: kontakt.name, datum: new Date().toISOString(), besprochen: phoneForm.besprochen, naechster_schritt: phoneForm.naechster_schritt, typ: 'Eingehend' });
      await base44.entities.Kontakt.update(id, { letzter_kontakt: todayISO() });
      setPhoneForm({ besprochen: '', naechster_schritt: '' }); setShowPhone(false); loadData();
      toast.success('Telefonat notiert');
    } catch (e) { toast.error('Fehler'); }
  };

  const toggleNoteErledigt = async (note) => { await base44.entities.Telefonnotiz.update(note.id, { erledigt: !note.erledigt }); loadData(); };

  if (loading) return <div className="p-8 text-center text-muted-foreground">Lade Kontakt...</div>;
  if (!kontakt) return <div className="p-8 text-center text-muted-foreground">Kontakt nicht gefunden.</div>;
  const offeneProjekte = projekte.filter((p) => p.status !== 'Abgeschlossen' && p.status !== 'Archiviert');

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <Link to="/kontakte" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="w-4 h-4" /> Zurück zu Kontakten</Link>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl md:text-3xl font-bold">{kontakt.name}</h1>
          {kontakt.firma && <p className="text-muted-foreground">{kontakt.firma}</p>}
          <span className="inline-block mt-1 bg-brand-light text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">{kontakt.rolle}</span>
        </div>
        <Button variant="outline" className="min-h-[48px] shrink-0" onClick={() => setEditMode(true)}><Edit2 className="w-4 h-4 mr-1" /> Bearbeiten</Button>
      </div>

      <Card className="p-5 shadow-sm">
        <div className="grid sm:grid-cols-2 gap-3 text-sm">
          {kontakt.telefon && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-brand" /> {kontakt.telefon}</div>}
          {kontakt.email && <div className="flex items-center gap-2"><Mail className="w-4 h-4 text-brand" /> {kontakt.email}</div>}
          {kontakt.adresse && <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-brand" /> {kontakt.adresse}</div>}
          {kontakt.letzter_kontakt && <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-brand" /> Letzter Kontakt: {formatDate(kontakt.letzter_kontakt)}</div>}
        </div>
        {kontakt.notizen && <p className="text-sm text-muted-foreground mt-3 pt-3 border-t border-border">{kontakt.notizen}</p>}
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Verknüpfte Projekte ({projekte.length})</h2>
          {offeneProjekte.length > 0 && <span className="bg-brand-light text-brand-dark text-xs font-medium px-2.5 py-1 rounded-full">{offeneProjekte.length} offen</span>}
        </div>
        <div className="flex flex-wrap gap-2">
          {projekte.map((p) => (
            <Link key={p.id} to={`/projekte/${p.id}`} className="inline-flex items-center gap-2 bg-cardbg hover:bg-brand-light rounded-full px-3 py-2 transition-colors">
              <span className="text-sm font-medium">{p.projekt_name}</span><StatusBadge status={p.status} />
            </Link>
          ))}
          {projekte.length === 0 && <p className="text-muted-foreground text-sm">Keine verknüpften Projekte.</p>}
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-lg">Telefonjournal</h2>
          <Button size="sm" className="bg-accent hover:bg-accent-dark text-white min-h-[40px]" onClick={() => setShowPhone(!showPhone)}><Plus className="w-4 h-4 mr-1" /> Telefonat</Button>
        </div>
        {showPhone && (
          <div className="space-y-3 mb-4 p-4 bg-cardbg rounded-xl">
            <div><Label>Besprochen</Label><Textarea value={phoneForm.besprochen} onChange={(e) => setPhoneForm({ ...phoneForm, besprochen: e.target.value })} rows={2} placeholder="Worum ging es?" autoFocus /></div>
            <div><Label>Nächster Schritt</Label><Textarea value={phoneForm.naechster_schritt} onChange={(e) => setPhoneForm({ ...phoneForm, naechster_schritt: e.target.value })} rows={1} placeholder="Was ist zu tun?" /></div>
            <Button onClick={savePhoneNote} disabled={!phoneForm.besprochen.trim()} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full">Speichern</Button>
          </div>
        )}
        <div className="space-y-2">
          {notizen.map((n) => (
            <div key={n.id} className={`p-3 rounded-xl min-h-[48px] ${n.erledigt ? 'opacity-50' : 'bg-cardbg'}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">{formatDateTime(n.datum)}</p>
                  <p className="text-sm mt-1">{n.besprochen}</p>
                  {n.naechster_schritt && <p className="text-sm font-medium text-accent mt-1">→ {n.naechster_schritt}</p>}
                </div>
                <button onClick={() => toggleNoteErledigt(n)} className="shrink-0 p-1">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${n.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : 'border-border'}`}>{n.erledigt && <Check className="w-3 h-3 text-white" />}</div>
                </button>
              </div>
            </div>
          ))}
          {notizen.length === 0 && <p className="text-muted-foreground text-sm">Keine Telefonate.</p>}
        </div>
      </Card>
      {editMode && <NeuerKontaktModal open={editMode} onClose={() => setEditMode(false)} onCreated={loadData} editKontakt={kontakt} />}
    </div>
  );
}