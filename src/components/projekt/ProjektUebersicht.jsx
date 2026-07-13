import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';

export default function ProjektUebersicht({ projekt, onUpdate }) {
  const [form, setForm] = useState({ ...projekt });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await base44.entities.Projekt.update(projekt.id, {
        ...form,
        stundensatz: Number(form.stundensatz) || 0,
        pauschalbetrag: Number(form.pauschalbetrag) || 0,
      });
      toast.success('Gespeichert');
      onUpdate();
    } catch (e) {
      toast.error('Fehler beim Speichern');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Stammdaten</h3>
        <div className="space-y-4">
          <div>
            <Label>Projektname</Label>
            <Input
              value={form.projekt_name || ''}
              onChange={(e) => setForm({ ...form, projekt_name: e.target.value })}
              className="min-h-[48px]"
            />
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
              <Label>{form.abrechnungsart === 'Pauschal' ? 'Pauschalbetrag (€)' : 'Stundensatz (€/h)'}</Label>
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
                value={form.startdatum || ''}
                onChange={(e) => setForm({ ...form, startdatum: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>Deadline</Label>
              <Input
                type="date"
                value={form.deadline || ''}
                onChange={(e) => setForm({ ...form, deadline: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea
              value={form.beschreibung || ''}
              onChange={(e) => setForm({ ...form, beschreibung: e.target.value })}
              rows={4}
            />
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea
              value={form.notizen || ''}
              onChange={(e) => setForm({ ...form, notizen: e.target.value })}
              rows={3}
            />
          </div>
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Kontakt</h3>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kunde Name</Label>
              <Input
                value={form.kunde_name || ''}
                onChange={(e) => setForm({ ...form, kunde_name: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>Firma</Label>
              <Input
                value={form.kunde_firma || ''}
                onChange={(e) => setForm({ ...form, kunde_firma: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Telefon</Label>
              <Input
                value={form.kunde_telefon || ''}
                onChange={(e) => setForm({ ...form, kunde_telefon: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
            <div>
              <Label>E-Mail</Label>
              <Input
                value={form.kunde_email || ''}
                onChange={(e) => setForm({ ...form, kunde_email: e.target.value })}
                className="min-h-[48px]"
              />
            </div>
          </div>
        </div>
      </Card>

      <Button
        onClick={handleSave}
        disabled={saving}
        className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full"
      >
        {saving ? 'Speichert...' : 'Änderungen speichern'}
      </Button>
    </div>
  );
}