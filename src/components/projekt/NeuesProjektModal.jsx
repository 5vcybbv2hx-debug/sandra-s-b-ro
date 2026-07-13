import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { base44 } from '@/api/base44Client';
import { getDefaultStundensatz } from '@/lib/settings';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';

export default function NeuesProjektModal({ onClose, onCreated }) {
  const [form, setForm] = useState({
    projekt_name: '',
    kunde_name: '',
    kunde_firma: '',
    kunde_telefon: '',
    kunde_email: '',
    projektart: 'Sonstiges',
    status: 'Anfrage',
    stundensatz: getDefaultStundensatz(),
    abrechnungsart: 'Stündlich',
    pauschalbetrag: 0,
    startdatum: todayISO(),
    deadline: '',
    beschreibung: '',
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    if (!form.projekt_name.trim()) return;
    setSaving(true);
    try {
      await base44.entities.Projekt.create({
        ...form,
        stundensatz: Number(form.stundensatz) || 0,
        pauschalbetrag: Number(form.pauschalbetrag) || 0,
      });
      toast.success('Projekt erstellt');
      onCreated();
      onClose();
    } catch (e) {
      toast.error('Fehler beim Erstellen');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Neues Projekt</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Projektname *</Label>
            <Input
              value={form.projekt_name}
              onChange={(e) => setForm({ ...form, projekt_name: e.target.value })}
              placeholder="z.B. Grundriss Müller"
              className="min-h-[48px]"
              autoFocus
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kunde Name</Label>
              <Input
                value={form.kunde_name}
                onChange={(e) => setForm({ ...form, kunde_name: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>Firma</Label>
              <Input
                value={form.kunde_firma}
                onChange={(e) => setForm({ ...form, kunde_firma: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.kunde_telefon}
                onChange={(e) => setForm({ ...form, kunde_telefon: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                value={form.kunde_email}
                onChange={(e) => setForm({ ...form, kunde_email: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Projektart</Label>
              <Select value={form.projektart} onValueChange={(v) => setForm({ ...form, projektart: v })}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Grundriss">Grundriss</SelectItem>
                  <SelectItem value="Schnitt">Schnitt</SelectItem>
                  <SelectItem value="Ansicht">Ansicht</SelectItem>
                  <SelectItem value="Eingabeplanung">Eingabeplanung</SelectItem>
                  <SelectItem value="Genehmigungsplanung">Genehmigungsplanung</SelectItem>
                  <SelectItem value="Ausführungsplanung">Ausführungsplanung</SelectItem>
                  <SelectItem value="Sonstiges">Sonstiges</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Anfrage">Anfrage</SelectItem>
                  <SelectItem value="Aktiv">Aktiv</SelectItem>
                  <SelectItem value="Wartend">Wartend</SelectItem>
                  <SelectItem value="Abgeschlossen">Abgeschlossen</SelectItem>
                  <SelectItem value="Archiviert">Archiviert</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Abrechnungsart</Label>
              <Select value={form.abrechnungsart} onValueChange={(v) => setForm({ ...form, abrechnungsart: v })}>
                <SelectTrigger className="min-h-[48px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Stündlich">Stündlich</SelectItem>
                  <SelectItem value="Pauschal">Pauschal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>{form.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag (€)' : 'Stundensatz (€)'}</Label>
              <Input
                type="number"
                value={form.abrechnungsart === 'Pauschal' ? form.pauschalbetrag : form.stundensatz}
                onChange={(e) =>
                  setForm({
                    ...form,
                    [form.abrechnungsart === 'Pauschal' ? 'pauschalbetrag' : 'stundensatz']: e.target.value,
                  })
                }
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Startdatum</Label>
              <Input
                type="date"
                value={form.startdatum}
                onChange={(e) => setForm({ ...form, startdatum: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={form.beschreibung}
              onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose} className="min-h-[48px]">
            Abbrechen
          </Button>
          <Button
            onClick={handleSave}
            disabled={!form.projekt_name.trim() || saving}
            className="min-h-[48px] bg-brand hover:bg-brand-dark text-white"
          >
            {saving ? 'Speichert...' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}