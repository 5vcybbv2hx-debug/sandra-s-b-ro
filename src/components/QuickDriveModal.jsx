import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import AddressInput from '@/components/fahrt/AddressInput';

export default function QuickDriveModal({ open, onOpenChange }) {
  const [startort, setStartort] = useState('');
  const [zielort, setZielort] = useState('');
  const [kilometer, setKilometer] = useState('');
  const [projekt_id, setProjektId] = useState('');
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [pastFahrten, setPastFahrten] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 50).then(setProjekte).catch(() => {});
      base44.entities.Firma.list('-created_date', 200).then(setFirmen).catch(() => {});
      base44.entities.Fahrt.list('-datum', 500).then(setPastFahrten).catch(() => {});
      setStartort(''); setZielort(''); setKilometer(''); setProjektId('');
    }
  }, [open]);

  // Häufige Adressen aus vergangenen Fahrten
  const frequentAddresses = useMemo(() => {
    const counts = {};
    pastFahrten.forEach(f => {
      if (f.startort) counts[f.startort] = (counts[f.startort] || 0) + 1;
      if (f.zielort) counts[f.zielort] = (counts[f.zielort] || 0) + 1;
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([label, count]) => ({ label, count }));
  }, [pastFahrten]);

  // Baustellen aus aktiven Projekten + Firmen-Adresse
  const projectAddresses = useMemo(() => {
    return projekte.map(p => {
      const firma = firmen.find(f => f.id === p.firma_id);
      return {
        label: p.projekt_name || p.name || 'Unbekannt',
        sublabel: firma?.adresse || null,
      };
    }).filter(p => p.label);
  }, [projekte, firmen]);

  const handleSave = async () => {
    if (!startort.trim() || !zielort.trim() || !kilometer) return;
    setSaving(true);
    try {
      await base44.entities.Fahrt.create({
        datum: todayISO(),
        startort: startort.trim(),
        zielort: zielort.trim(),
        kilometer: parseFloat(kilometer),
        projekt_id: projekt_id || undefined,
        status: 'abgeschlossen',
      });
      toast.success('Fahrt gespeichert');
      onOpenChange(false);
    } catch (e) {
      toast.error('Fehler beim Speichern');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>🚗 Schnell-Fahrt</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Start *</Label>
            <AddressInput
              value={startort}
              onChange={setStartort}
              placeholder="z.B. Büro"
              frequentAddresses={frequentAddresses}
              projectAddresses={projectAddresses}
              autoFocus
            />
          </div>
          <div>
            <Label>Ziel *</Label>
            <AddressInput
              value={zielort}
              onChange={setZielort}
              placeholder="z.B. Baustelle"
              frequentAddresses={frequentAddresses}
              projectAddresses={projectAddresses}
            />
          </div>
          <div>
            <Label>Kilometer *</Label>
            <input
              type="number"
              step="0.1"
              value={kilometer}
              onChange={e => setKilometer(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSave()}
              className="w-full min-h-[48px] px-3 py-2 text-sm rounded-md border bg-background"
              placeholder="z.B. 12.5"
            />
          </div>
          <div>
            <Label>Projekt (optional)</Label>
            <Select value={projekt_id || '_none'} onValueChange={v => setProjektId(v === '_none' ? '' : v)}>
              <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Kein Projekt" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="_none">Kein Projekt</SelectItem>
                {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={!startort.trim() || !zielort.trim() || !kilometer || saving} className="min-h-[48px] w-full bg-brand hover:bg-brand-dark text-white">
            {saving ? 'Speichert...' : 'Speichern'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
