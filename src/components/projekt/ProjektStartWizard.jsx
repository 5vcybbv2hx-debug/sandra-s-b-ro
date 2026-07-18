import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { getDefaultStundensatz } from '@/lib/settings';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const PROJEKTARTEN = ['Wohnbau', 'Gewerbebau', 'Öffentliches Bauvorhaben', 'Umbau/Sanierung', 'Sonstiges'];
const BRANCHEN = ['Architekturbüro', 'Bauträger', 'Bauunternehmen', 'Privatperson', 'Behörde', 'Sonstiges'];
const ROLLEN = ['Projektleiter', 'Geschäftsführer', 'Bauleiter', 'Sachbearbeiter', 'Bauherr', 'Sonstiges'];
const CHECKS = ['Kunde passt zu mir? (Referenzqualität, Bezahlungsmoral, Umgangston)', 'Terminvorstellung realistisch?', 'Preis kalkuliert und schriftlich fixiert?', 'Leistungsumfang klar abgegrenzt?', 'Baubeschreibung/Planunterlagen vollständig?', 'Vorkosten geklärt?', 'Versicherungsschutz prüfen nötig?'];

export default function ProjektStartWizard({ onClose, onCreated }) {
  const [step, setStep] = useState(0);
  const [firmen, setFirmen] = useState([]);
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [erfahrungswerte, setErfahrungswerte] = useState([]);
  const [firmaMode, setFirmaMode] = useState('existing');
  const [apMode, setApMode] = useState('existing');
  const [firmaId, setFirmaId] = useState('');
  const [newFirma, setNewFirma] = useState({ name: '', branche: 'Sonstiges', adresse: '', telefon_zentrale: '', email_allgemein: '' });
  const [apId, setApId] = useState('');
  const [newAp, setNewAp] = useState({ vorname: '', nachname: '', rolle: 'Sonstiges', telefon: '', email: '' });
  const [projekt, setProjekt] = useState({ projekt_name: '', projektart: 'Sonstiges', beschreibung: '', startdatum: todayISO(), deadline: '', abrechnungsart: 'Stündlich', stundensatz: getDefaultStundensatz(), pauschalbetrag: 0 });
  const [checks, setChecks] = useState(CHECKS.map(() => true));
  const [phaseStunden, setPhaseStunden] = useState({ Entwurf: 0, Baugesuch: 0, Werkplanung: 0 });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([base44.entities.Firma.list('-name', 200), base44.entities.Ansprechpartner.list('-nachname', 200), base44.entities.Phasen_Erfahrungswerte.list('-projektart', 200)]).then(([f, a, e]) => { setFirmen(f); setAnsprechpartner(a); setErfahrungswerte(e); }).catch(() => {});
  }, []);

  useEffect(() => {
    if (step === 3) {
      const vals = erfahrungswerte.filter(e => e.projektart === projekt.projektart);
      const ps = { Entwurf: 0, Baugesuch: 0, Werkplanung: 0 };
      vals.forEach(v => { if (ps.hasOwnProperty(v.phase)) ps[v.phase] = v.durchschnitt_stunden || 0; });
      setPhaseStunden(ps);
    }
  }, [step, projekt.projektart, erfahrungswerte]);

  const filteredAP = firmaId ? ansprechpartner.filter(a => a.firma_id === firmaId) : ansprechpartner;
  const unresolved = checks.map((c, i) => !c ? CHECKS[i] : null).filter(Boolean);

  const handleCreate = async () => {
    setSaving(true);
    try {
      let fId = firmaId;
      if (firmaMode === 'new') { const f = await base44.entities.Firma.create(newFirma); fId = f.id; }
      let aId = apId && apId !== '_none' ? apId : '';
      if (apMode === 'new') { const a = await base44.entities.Ansprechpartner.create({ ...newAp, firma_id: fId || undefined }); aId = a.id; }
      const p = await base44.entities.Projekt.create({ ...projekt, firma_id: fId || undefined, haupt_ansprechpartner_id: aId || undefined, stundensatz: Number(projekt.stundensatz) || 0, pauschalbetrag: Number(projekt.pauschalbetrag) || 0, status: 'Aktiv', aktuelle_phase: 'Entwurf' });
      await base44.entities.Projektphase.bulkCreate([
        { projekt_id: p.id, phase: 'Entwurf', status: 'Aktiv', stunden_geschaetzt: Number(phaseStunden.Entwurf) || 0 },
        { projekt_id: p.id, phase: 'Baugesuch', status: 'Geplant', stunden_geschaetzt: Number(phaseStunden.Baugesuch) || 0 },
        { projekt_id: p.id, phase: 'Werkplanung', status: 'Geplant', stunden_geschaetzt: Number(phaseStunden.Werkplanung) || 0 },
      ]);
      toast.success('Projekt erstellt'); onCreated(); onClose();
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  const canNext = step === 0 ? (firmaMode === 'existing' ? !!firmaId : !!newFirma.name.trim()) : step === 1 ? !!projekt.projekt_name.trim() : true;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Neues Projekt — Schritt {step + 1}/4</DialogTitle></DialogHeader>
        <div className="flex gap-1 mb-4">{[0,1,2,3].map(i => <div key={i} className={cn('h-1.5 flex-1 rounded-full', i <= step ? 'bg-brand' : 'bg-border')} />)}</div>

        {step === 0 && (
          <div className="space-y-4">
            <div><Label>Firma</Label><div className="flex gap-2 mt-1"><button onClick={() => setFirmaMode('existing')} className={cn('flex-1 p-2 rounded-lg text-sm border-2 min-h-[40px]', firmaMode === 'existing' ? 'border-brand bg-brand-light' : 'border-border')}>Bestehend</button><button onClick={() => setFirmaMode('new')} className={cn('flex-1 p-2 rounded-lg text-sm border-2 min-h-[40px]', firmaMode === 'new' ? 'border-brand bg-brand-light' : 'border-border')}>Neu</button></div>{firmaMode === 'existing' ? <Select value={firmaId} onValueChange={setFirmaId}><SelectTrigger className="min-h-[48px] mt-2"><SelectValue placeholder="Firma wählen" /></SelectTrigger><SelectContent>{firmen.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent></Select> : <div className="space-y-2 mt-2"><Input placeholder="Firmenname *" value={newFirma.name} onChange={e => setNewFirma({...newFirma, name: e.target.value})} className="min-h-[48px]" /><div className="grid grid-cols-2 gap-2"><Select value={newFirma.branche} onValueChange={v => setNewFirma({...newFirma, branche: v})}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{BRANCHEN.map(b => <SelectItem key={b} value={b}>{b}</SelectItem>)}</SelectContent></Select><Input placeholder="Telefon" value={newFirma.telefon_zentrale} onChange={e => setNewFirma({...newFirma, telefon_zentrale: e.target.value})} className="min-h-[48px]" /></div><Input placeholder="Adresse" value={newFirma.adresse} onChange={e => setNewFirma({...newFirma, adresse: e.target.value})} className="min-h-[48px]" /><Input placeholder="E-Mail" value={newFirma.email_allgemein} onChange={e => setNewFirma({...newFirma, email_allgemein: e.target.value})} className="min-h-[48px]" /></div>}</div>
            <div><Label>Hauptansprechpartner</Label><div className="flex gap-2 mt-1"><button onClick={() => setApMode('existing')} className={cn('flex-1 p-2 rounded-lg text-sm border-2 min-h-[40px]', apMode === 'existing' ? 'border-brand bg-brand-light' : 'border-border')}>Bestehend</button><button onClick={() => setApMode('new')} className={cn('flex-1 p-2 rounded-lg text-sm border-2 min-h-[40px]', apMode === 'new' ? 'border-brand bg-brand-light' : 'border-border')}>Neu</button></div>{apMode === 'existing' ? <Select value={apId} onValueChange={setApId}><SelectTrigger className="min-h-[48px] mt-2"><SelectValue placeholder="Person wählen (optional)" /></SelectTrigger><SelectContent><SelectItem value="_none">Keine</SelectItem>{filteredAP.map(a => <SelectItem key={a.id} value={a.id}>{a.vorname} {a.nachname}</SelectItem>)}</SelectContent></Select> : <div className="space-y-2 mt-2"><div className="grid grid-cols-2 gap-2"><Input placeholder="Vorname *" value={newAp.vorname} onChange={e => setNewAp({...newAp, vorname: e.target.value})} className="min-h-[48px]" /><Input placeholder="Nachname *" value={newAp.nachname} onChange={e => setNewAp({...newAp, nachname: e.target.value})} className="min-h-[48px]" /></div><div className="grid grid-cols-2 gap-2"><Select value={newAp.rolle} onValueChange={v => setNewAp({...newAp, rolle: v})}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{ROLLEN.map(r => <SelectItem key={r} value={r}>{r}</SelectItem>)}</SelectContent></Select><Input placeholder="Telefon" value={newAp.telefon} onChange={e => setNewAp({...newAp, telefon: e.target.value})} className="min-h-[48px]" /></div><Input placeholder="E-Mail" value={newAp.email} onChange={e => setNewAp({...newAp, email: e.target.value})} className="min-h-[48px]" /></div>}</div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <div><Label>Projektname *</Label><Input value={projekt.projekt_name} onChange={e => setProjekt({...projekt, projekt_name: e.target.value})} className="min-h-[48px]" autoFocus /></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Projektart</Label><Select value={projekt.projektart} onValueChange={v => setProjekt({...projekt, projektart: v})}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent>{PROJEKTARTEN.map(v => <SelectItem key={v} value={v}>{v}</SelectItem>)}</SelectContent></Select></div><div><Label>Abrechnung</Label><Select value={projekt.abrechnungsart} onValueChange={v => setProjekt({...projekt, abrechnungsart: v})}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Stündlich">Stundensatz</SelectItem><SelectItem value="Pauschal">Pauschale</SelectItem></SelectContent></Select></div></div>
            <div className="grid grid-cols-2 gap-3"><div><Label>Startdatum</Label><Input type="date" value={projekt.startdatum} onChange={e => setProjekt({...projekt, startdatum: e.target.value})} className="min-h-[48px]" /></div><div><Label>Deadline</Label><Input type="date" value={projekt.deadline} onChange={e => setProjekt({...projekt, deadline: e.target.value})} className="min-h-[48px]" /></div></div>
            {projekt.abrechnungsart === 'Stündlich' ? <div><Label>Stundensatz (€/h)</Label><Input type="number" value={projekt.stundensatz} onChange={e => setProjekt({...projekt, stundensatz: e.target.value})} className="min-h-[48px]" /></div> : <div><Label>Pauschalbetrag (€)</Label><Input type="number" value={projekt.pauschalbetrag} onChange={e => setProjekt({...projekt, pauschalbetrag: e.target.value})} className="min-h-[48px]" /></div>}
            <div><Label>Beschreibung</Label><Textarea value={projekt.beschreibung} onChange={e => setProjekt({...projekt, beschreibung: e.target.value})} rows={2} /></div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            {CHECKS.map((q, i) => <div key={i} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"><span className="text-sm flex-1">{q}</span><div className="flex gap-1 shrink-0"><button onClick={() => setChecks(checks.map((c, j) => j === i ? true : c))} className={cn('px-3 py-1 rounded-lg text-xs font-medium min-h-[32px]', checks[i] ? 'bg-status-abgeschlossen text-white' : 'bg-white text-muted-foreground')}>Ja</button><button onClick={() => setChecks(checks.map((c, j) => j === i ? false : c))} className={cn('px-3 py-1 rounded-lg text-xs font-medium min-h-[32px]', !checks[i] ? 'bg-amber-500 text-white' : 'bg-white text-muted-foreground')}>Nein</button></div></div>)}
            {unresolved.length > 0 && <div className="p-4 bg-amber-50 border-2 border-amber-200 rounded-xl"><p className="font-medium text-amber-700 mb-2">⚠️ Bevor du startest:</p><ul className="text-sm text-amber-700 space-y-1">{unresolved.map((u, i) => <li key={i}>• {u}</li>)}</ul></div>}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">3 Phasen werden automatisch erstellt:</p>
            {['Entwurf', 'Baugesuch', 'Werkplanung'].map(phase => <div key={phase} className="flex items-center gap-3 p-3 bg-cardbg rounded-xl min-h-[48px]"><div className="w-8 h-8 rounded-full bg-brand text-white flex items-center justify-center text-sm font-bold shrink-0">{['E', 'B', 'W'][['Entwurf', 'Baugesuch', 'Werkplanung'].indexOf(phase)]}</div><span className="font-medium flex-1">{phase}</span><Input type="number" value={phaseStunden[phase]} onChange={e => setPhaseStunden({...phaseStunden, [phase]: e.target.value})} className="w-24 h-9 min-h-[36px] text-sm" /><span className="text-xs text-muted-foreground">h geschätzt</span></div>)}
          </div>
        )}

        <DialogFooter>
          {step > 0 && <Button variant="outline" onClick={() => setStep(step - 1)} className="min-h-[48px]">Zurück</Button>}
          {step < 3 && <Button onClick={() => setStep(step + 1)} disabled={!canNext} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">Weiter</Button>}
          {step === 3 && <Button onClick={handleCreate} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">{saving ? 'Speichert...' : 'Projekt erstellen'}</Button>}
          {step === 2 && unresolved.length > 0 && <Button onClick={() => setStep(3)} className="bg-amber-500 hover:bg-amber-600 text-white min-h-[48px] flex-1">Trotzdem starten</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}