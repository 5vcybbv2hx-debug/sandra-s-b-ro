import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ShoppingBag, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const KATEGORIEN = ['Büromaterial', 'Plotter/Papier', 'Druck/Tinte', 'Werkzeug', 'Sonstiges'];

export default function QuickMaterialModal({ open, onOpenChange }) {
  const [titel, setTitel] = useState('');
  const [kategorie, setKategorie] = useState('Büromaterial');
  const [menge, setMenge] = useState('');
  const [dringend, setDringend] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!titel.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Bestellliste.create({
        titel: titel.trim(),
        kategorie,
        menge: menge.trim() || '1 Stück',
        prioritaet: dringend ? 'Dringend' : 'Normal',
        status: 'Offen',
      });
      toast.success('Material gemeldet');
      setTitel(''); setMenge(''); setDringend(false); setKategorie('Büromaterial');
      onOpenChange();
    } catch (e) {
      toast.error('Konnte nicht speichern');
    } finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-brand" />
            Material melden
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Input
            value={titel}
            onChange={(e) => setTitel(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), save())}
            placeholder="Was wird gebraucht? (z.B. Plotterpapier A0)"
            className="min-h-[48px]"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={kategorie} onValueChange={setKategorie}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORIEN.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={menge}
              onChange={(e) => setMenge(e.target.value)}
              placeholder="Menge (z.B. 2 Rollen)"
              className="min-h-[48px]"
            />
          </div>
          <button
            onClick={() => setDringend(!dringend)}
            className={`w-full px-4 py-3 rounded-lg border min-h-[48px] flex items-center gap-2 text-sm font-medium transition-colors ${
              dringend
                ? 'border-amber-400 bg-amber-50 text-amber-700'
                : 'border-border bg-cardbg text-muted-foreground'
            }`}
          >
            <AlertCircle className="w-4 h-4" />
            {dringend ? 'Dringend — muss schnell bestellt werden' : 'Als dringend markieren'}
          </button>
          <Button
            onClick={save}
            disabled={!titel.trim() || saving}
            className="w-full bg-brand hover:bg-brand-dark text-white min-h-[48px]"
          >
            {saving ? 'Speichert...' : 'Material melden'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
