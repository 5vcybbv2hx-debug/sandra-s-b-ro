import { useState, useEffect, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { Search, Phone, Building2, X } from 'lucide-react';

export default function PhoneModal({ open, onOpenChange, presetAnsprechpartnerId }) {
  const [ansprechpartner, setAnsprechpartner] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [allProjekte, setAllProjekte] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedPerson, setSelectedPerson] = useState(null);
  const [showResults, setShowResults] = useState(false);
  const [form, setForm] = useState({ projekt_id: '', besprochen: '', naechster_schritt: '', termin: '', als_aufgabe: false, typ: 'Eingehend' });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      Promise.all([base44.entities.Ansprechpartner.list('-nachname', 200), base44.entities.Firma.list('-name', 200), base44.entities.Projekt.list('-updated_date', 200)])
        .then(([p, f, pr]) => { setAnsprechpartner(p); setFirmen(f); setAllProjekte(pr); if (presetAnsprechpartnerId) { const preset = p.find((x) => x.id === presetAnsprechpartnerId); if (preset) { setSelectedPerson(preset); setSearch(`${preset.vorname} ${preset.nachname}`); } } }).catch(() => {});
      setForm({ projekt_id: '', besprochen: '', naechster_schritt: '', termin: '', als_aufgabe: false, typ: 'Eingehend' });
      if (!presetAnsprechpartnerId) { setSelectedPerson(null); setSearch(''); }
    }
  }, [open, presetAnsprechpartnerId]);

  const firmaName = (firmaId) => firmen.find((f) => f.id === firmaId)?.name || '';
  const selectedFirma = selectedPerson?.firma_id ? firmen.find((f) => f.id === selectedPerson.firma_id) : null;
  const filteredPersons = search.trim() ? ansprechpartner.filter((p) => `${p.vorname} ${p.nachname}`.toLowerCase().includes(search.trim().toLowerCase())) : ansprechpartner.slice(0, 8);
  const personProjekte = selectedPerson ? allProjekte.filter((p) => p.firma_id === selectedPerson.firma_id || p.haupt_ansprechpartner_id === selectedPerson.id) : allProjekte.filter((p) => p.status === 'Aktiv');

  const selectPerson = (p) => { setSelectedPerson(p); setSearch(`${p.vorname} ${p.nachname}`); setShowResults(false); setForm({ ...form, projekt_id: '' }); };

  const handleSave = async () => {
    if (!selectedPerson && !search.trim()) return;
    setSaving(true);
    try {
      const personName = selectedPerson ? `${selectedPerson.vorname} ${selectedPerson.nachname}` : search.trim();
      await base44.entities.Telefonnotiz.create({ ansprechpartner_id: selectedPerson?.id || undefined, kontakt_name: personName, telefonnummer: selectedPerson?.telefon || '', projekt_id: form.projekt_id || undefined, besprochen: form.besprochen, naechster_schritt: form.naechster_schritt, termin: form.termin || undefined, datum: new Date().toISOString(), typ: form.typ, als_aufgabe_angelegt: form.als_aufgabe });
      if (selectedPerson) await base44.entities.Ansprechpartner.update(selectedPerson.id, { letzter_kontakt: todayISO() });
      if (form.als_aufgabe && form.naechster_schritt.trim()) await base44.entities.Aufgabe.create({ titel: form.naechster_schritt, projekt_id: form.projekt_id || undefined, prioritaet: 'A', erledigt: false });
      toast.success('Telefonat notiert'); onOpenChange(false);
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>📞 Telefonat notieren</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="relative">
            <Label>Ansprechpartner suchen</Label>
            <div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" /><Input value={search} onChange={(e) => { setSearch(e.target.value); setShowResults(true); setSelectedPerson(null); }} onFocus={() => setShowResults(true)} placeholder="Name eingeben..." className="pl-10 min-h-[48px] pr-10" autoFocus={!presetAnsprechpartnerId} />{selectedPerson && <button onClick={() => { setSelectedPerson(null); setSearch(''); }} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"><X className="w-4 h-4" /></button>}</div>
            {showResults && !selectedPerson && (<div className="absolute z-50 mt-1 w-full bg-popover border border-border rounded-xl shadow-lg max-h-64 overflow-y-auto">{filteredPersons.map((p) => (<button key={p.id} onClick={() => selectPerson(p)} className="w-full flex items-center justify-between gap-2 p-3 hover:bg-accent text-left min-h-[48px] border-b border-border/50 last:border-0"><div className="min-w-0"><p className="font-medium truncate">{p.vorname} {p.nachname}</p><p className="text-sm text-muted-foreground truncate">{firmaName(p.firma_id) || 'Privatperson'} {p.rolle && `· ${p.rolle}`}</p></div>{p.telefon && <span className="text-xs text-muted-foreground shrink-0 flex items-center gap-1"><Phone className="w-3 h-3" /> {p.telefon}</span>}</button>))}{filteredPersons.length === 0 && <p className="p-3 text-sm text-muted-foreground text-center">Keine Treffer.</p>}</div>)}
          </div>
          {selectedPerson && (<div className="p-3 bg-cardbg rounded-xl space-y-1"><div className="flex items-center gap-2">{selectedFirma ? <><Building2 className="w-4 h-4 text-brand" /><span className="text-sm font-medium">{selectedFirma.name}</span></> : <span className="text-sm text-muted-foreground">Privatperson</span>}</div>{selectedPerson.telefon && <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-accent" /><span className="text-sm">{selectedPerson.telefon}</span></div>}</div>)}
          <div><Label>Projekt (optional)</Label><Select value={form.projekt_id} onValueChange={(v) => setForm({ ...form, projekt_id: v })}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger><SelectContent>{personProjekte.map((p) => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select></div>
          <div><Label>Besprochen</Label><Textarea value={form.besprochen} onChange={(e) => setForm({ ...form, besprochen: e.target.value })} rows={3} placeholder="Worum ging es?" /></div>
          <div><Label>Nächster Schritt</Label><Textarea value={form.naechster_schritt} onChange={(e) => setForm({ ...form, naechster_schritt: e.target.value })} rows={2} placeholder="Was ist zu tun?" /></div>
          <div className="grid grid-cols-2 gap-3"><div><Label>Termin?</Label><Input type="date" value={form.termin} onChange={(e) => setForm({ ...form, termin: e.target.value })} className="min-h-[48px]" /></div><div><Label>Typ</Label><Select value={form.typ} onValueChange={(v) => setForm({ ...form, typ: v })}><SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Eingehend">Eingehend</SelectItem><SelectItem value="Ausgehend">Ausgehend</SelectItem></SelectContent></Select></div></div>
          <div className="flex items-center justify-between p-3 bg-cardbg rounded-xl"><Label className="cursor-pointer">Als Aufgabe anlegen (Priorität A)</Label><Switch checked={form.als_aufgabe} onCheckedChange={(v) => setForm({ ...form, als_aufgabe: v })} /></div>
        </div>
        <DialogFooter><Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleSave} disabled={(!selectedPerson && !search.trim()) || saving} className="min-h-[48px] bg-accent hover:bg-accent-dark text-white">{saving ? 'Speichert...' : 'Speichern'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}