import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { formatCurrency, formatDate } from '@/lib/format';
import { toast } from 'sonner';

export default function AbrechnungErstellenModal({ onClose, onCreated }) {
  const [projekte, setProjekte] = useState([]);
  const [projektId, setProjektId] = useState('');
  const [eintraege, setEintraege] = useState([]);
  const [selected, setSelected] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => { base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 50).then(setProjekte).catch(() => {}); }, []);

  useEffect(() => { if (projektId) { base44.entities.Zeiteintrag.filter({ projekt_id: projektId, ist_abgerechnet: false }, '-datum', 200).then(z => { setEintraege(z.filter(x => !x.timer_laeuft)); setSelected([]); }).catch(() => {}); } }, [projektId]);

  const projekt = projekte.find(p => p.id === projektId);
  const stundensatz = projekt?.stundensatz || 0;
  const totalStunden = eintraege.filter(e => selected.includes(e.id)).reduce((s, e) => s + (e.stunden || 0), 0);
  const betragNetto = totalStunden * stundensatz;
  const mwst = betragNetto * 0.19;
  const betragBrutto = betragNetto + mwst;

  const toggle = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  const toggleAll = () => setSelected(selected.length === eintraege.length ? [] : eintraege.map(e => e.id));

  const handleCreate = async () => {
    if (selected.length === 0) return;
    setSaving(true);
    try {
      const dates = eintraege.filter(e => selected.includes(e.id)).map(e => e.datum).filter(Boolean).sort();
      const year = new Date().getFullYear();
      const all = await base44.entities.Abrechnung.list('-created_date', 500);
      const maxNum = all.filter(a => a.rechnungsnummer?.startsWith(`RE-${year}-`)).reduce((max, a) => Math.max(max, parseInt(a.rechnungsnummer?.split('-')[2] || '0')), 0);
      const monat = dates[0]?.slice(0, 7) || '';
      await base44.entities.Abrechnung.create({ projekt_id: projektId, monat, von_datum: dates[0], bis_datum: dates[dates.length - 1], stunden_gesamt: totalStunden, stundensatz, betrag_netto: betragNetto, betrag_brutto: betragBrutto, mwst, status: 'Entwurf', rechnungsnummer: `RE-${year}-${String(maxNum + 1).padStart(3, '0')}`, zeiteintrag_ids: selected });
      await base44.entities.Zeiteintrag.bulkUpdate(selected.map(id => ({ id, ist_abgerechnet: true })));
      toast.success('Abrechnung erstellt'); onCreated(); onClose();
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>Neue Abrechnung</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Select value={projektId} onValueChange={setProjektId}><SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Projekt wählen" /></SelectTrigger><SelectContent>{projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}</SelectContent></Select>{projekt && <p className="text-sm text-muted-foreground mt-1">Stundensatz: {formatCurrency(stundensatz)}/h</p>}</div>
          {projektId && eintraege.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-2"><p className="text-sm font-medium">Offene Zeiteinträge ({eintraege.length})</p><button onClick={toggleAll} className="text-xs text-brand hover:underline">{selected.length === eintraege.length ? 'Alle abwählen' : 'Alle auswählen'}</button></div>
              <div className="space-y-1 max-h-64 overflow-y-auto">{eintraege.map(e => <button key={e.id} onClick={() => toggle(e.id)} className={`w-full flex items-center gap-3 p-3 rounded-xl min-h-[48px] text-left border-2 transition-colors ${selected.includes(e.id) ? 'border-brand bg-brand-light' : 'border-border'}`}><div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 ${selected.includes(e.id) ? 'bg-brand border-brand' : 'border-border'}`}>{selected.includes(e.id) && <span className="text-white text-xs">✓</span>}</div><div className="flex-1 min-w-0"><p className="text-sm font-medium">{e.stunden} h · {formatDate(e.datum)}</p><p className="text-xs text-muted-foreground truncate">{e.beschreibung || '—'}</p></div></button>)}</div>
            </div>
          )}
          {projektId && eintraege.length === 0 && <p className="text-muted-foreground text-sm text-center py-4">Keine offenen Zeiteinträge.</p>}
          {selected.length > 0 && (
            <div className="p-4 bg-cardbg rounded-xl space-y-2"><div className="flex justify-between text-sm"><span className="text-muted-foreground">Stunden gesamt</span><span className="font-medium">{totalStunden.toFixed(1)} h</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">Netto</span><span className="font-medium">{formatCurrency(betragNetto)}</span></div><div className="flex justify-between text-sm"><span className="text-muted-foreground">MwSt (19%)</span><span className="font-medium">{formatCurrency(mwst)}</span></div><div className="flex justify-between font-bold border-t border-border pt-2"><span>Brutto</span><span className="text-brand-dark">{formatCurrency(betragBrutto)}</span></div></div>
          )}
        </div>
        <DialogFooter><Button variant="outline" onClick={onClose} className="min-h-[48px]">Abbrechen</Button><Button onClick={handleCreate} disabled={selected.length === 0 || saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">{saving ? 'Speichert...' : 'Erstellen'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}