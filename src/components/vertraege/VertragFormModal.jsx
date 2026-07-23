import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Upload, FileText } from 'lucide-react';

const empty = {
  titel: '', kategorie: 'Sonstiges', anbieter: '', abschlussdatum: '',
  kuendigungsfrist: '', naechste_kuendigung: '', status: 'Aktiv',
  kosten_jaehrlich: 0, dokument_url: '', notizen: '',
};

export default function VertragFormModal({ open, onClose, onSaved, editVertrag }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState(empty);

  useEffect(() => {
    if (editVertrag) setForm({ ...empty, ...editVertrag });
    else setForm(empty);
  }, [editVertrag, open]);

  const handleUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, dokument_url: file_url }));
      toast.success('Dokument hochgeladen');
    } catch { toast.error('Upload fehlgeschlagen'); }
    finally { setUploading(false); }
  };

  const handleSubmit = async () => {
    if (!form.titel) { toast.error('Titel ist erforderlich'); return; }
    setSaving(true);
    try {
      const payload = { ...form, kosten_jaehrlich: Number(form.kosten_jaehrlich) || 0 };
      if (editVertrag) {
        await base44.entities.Vertrag.update(editVertrag.id, payload);
        toast.success('Vertrag aktualisiert');
      } else {
        await base44.entities.Vertrag.create(payload);
        toast.success('Vertrag erstellt');
      }
      onSaved();
      onClose();
    } catch { toast.error('Speichern fehlgeschlagen'); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{editVertrag ? 'Vertrag bearbeiten' : 'Neuer Vertrag'}</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div><Label>Titel *</Label><Input value={form.titel} onChange={(e) => setForm(f => ({ ...f, titel: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Kategorie</Label>
              <Select value={form.kategorie} onValueChange={(v) => setForm(f => ({ ...f, kategorie: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Software', 'Versicherung', 'Miete', 'Dienstleistung', 'Sonstiges'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Anbieter</Label><Input value={form.anbieter} onChange={(e) => setForm(f => ({ ...f, anbieter: e.target.value }))} /></div>
          </div>
          <div><Label>Abschlussdatum</Label><Input type="date" value={form.abschlussdatum} onChange={(e) => setForm(f => ({ ...f, abschlussdatum: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Kündigungsfrist</Label><Input value={form.kuendigungsfrist} onChange={(e) => setForm(f => ({ ...f, kuendigungsfrist: e.target.value }))} placeholder="z.B. 3 Monate zum Jahresende" /></div>
            <div><Label>Nächste Kündigung</Label><Input type="date" value={form.naechste_kuendigung} onChange={(e) => setForm(f => ({ ...f, naechste_kuendigung: e.target.value }))} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {['Aktiv', 'Gekuendigt', 'Ausgelaufen'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Kosten jährlich (€)</Label><Input type="number" step="0.01" value={form.kosten_jaehrlich} onChange={(e) => setForm(f => ({ ...f, kosten_jaehrlich: e.target.value }))} /></div>
          </div>
          <div>
            <Label>Dokument (PDF)</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => document.getElementById('vertrag-doc-upload')?.click()} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {form.dokument_url ? 'Ersetzen' : 'Hochladen'}
              </Button>
              {form.dokument_url && <FileText className="w-4 h-4 text-brand" />}
              <input id="vertrag-doc-upload" type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
            </div>
          </div>
          <div><Label>Notizen</Label><Textarea value={form.notizen} onChange={(e) => setForm(f => ({ ...f, notizen: e.target.value }))} rows={2} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-brand hover:bg-brand/90 text-white gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editVertrag ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}