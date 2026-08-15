import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

export default function QuickDriveModal({ open, onOpenChange }) {
  const [startort, setStartort] = useState('');
  const [zielort, setZielort] = useState('');
  const [kilometer, setKilometer] = useState('');
  const [projekt_id, setProjektId] = useState('');
  const [projekte, setProjekte] = useState([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      base44.entities.Projekt.filter({ status: 'Aktiv' }, '-updated_date', 50).then(setProjekte).catch(() => {});
      setStartort(''); setZielort(''); setKilometer(''); setProjektId('');
    }
  }, [open]);

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
            <Input value={startort} onChange={e => setStartort(e.target.value)} className="min-h-[48px]" placeholder="z.B. Büro" autoFocus />
          </div>
          <div>
            <Label>Ziel *</Label>
            <Input value={zielort} onChange={e => setZielort(e.target.value)} className="min-h-[48px]" placeholder="z.B. Baustelle" />
          </div>
          <div>
            <Label>Kilometer *</Label>
            <Input type="number" step="0.1" value={kilometer} onChange={e => setKilometer(e.target.value)} onKeyDown={e => e.key === 'Enter' && handleSave()} className="min-h-[48px]" placeholder="z.B. 12.5" />
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