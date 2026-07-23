import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate, formatCurrency, todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, Upload, FileText } from 'lucide-react';

export default function AngebotFormModal({ open, onClose, onSaved, editAngebot, firmen, projekte }) {
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({
    nummer: '', firma_id: '', projekt_id: '', datum: todayISO(),
    betreff: '', betrag_netto: 0, betrag_brutto: 0, status: 'Entwurf',
    pdf_url: '', notizen: '', gueltig_bis: '', sevdesk_id: '',
  });

  useEffect(() => {
    if (editAngebot) {
      setForm({
        nummer: editAngebot.nummer || '', firma_id: editAngebot.firma_id || '',
        projekt_id: editAngebot.projekt_id || '', datum: editAngebot.datum || todayISO(),
        betreff: editAngebot.betreff || '', betrag_netto: editAngebot.betrag_netto || 0,
        betrag_brutto: editAngebot.betrag_brutto || 0, status: editAngebot.status || 'Entwurf',
        pdf_url: editAngebot.pdf_url || '', notizen: editAngebot.notizen || '',
        gueltig_bis: editAngebot.gueltig_bis || '', sevdesk_id: editAngebot.sevdesk_id || '',
      });
    } else {
      setForm(f => ({ ...f, datum: todayISO() }));
    }
  }, [editAngebot, open]);

  const generateNummer = async () => {
    try {
      const year = new Date().getFullYear();
      const existing = await base44.entities.Angebot.filter({}, '-nummer', 500);
      const yearNums = existing.filter(a => (a.nummer || '').startsWith(`AN-${year}-`));
      const next = String(yearNums.length + 1).padStart(3, '0');
      setForm(f => ({ ...f, nummer: `AN-${year}-${next}` }));
    } catch { toast.error('Nummer konnte nicht generiert werden'); }
  };

  const handleUploadPdf = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      setForm(f => ({ ...f, pdf_url: file_url }));
      toast.success('PDF hochgeladen');
    } catch { toast.error('PDF-Upload fehlgeschlagen'); }
    finally { setUploading(false); }
  };

  const handleNettoChange = (netto) => {
    const n = parseFloat(netto) || 0;
    setForm(f => ({ ...f, betrag_netto: n, betrag_brutto: Math.round(n * 1.19 * 100) / 100 }));
  };

  const handleSubmit = async () => {
    if (!form.firma_id || !form.betreff) { toast.error('Firma und Betreff sind erforderlich'); return; }
    if (!form.nummer) { toast.error('Bitte Nummer generieren'); return; }
    setSaving(true);
    try {
      const payload = { ...form, betrag_netto: Number(form.betrag_netto) || 0, betrag_brutto: Number(form.betrag_brutto) || 0 };
      delete payload.projekt_id_val;
      if (!payload.projekt_id) delete payload.projekt_id;
      if (editAngebot) {
        await base44.entities.Angebot.update(editAngebot.id, payload);
        toast.success('Angebot aktualisiert');
      } else {
        await base44.entities.Angebot.create(payload);
        toast.success('Angebot erstellt');
      }
      onSaved();
      onClose();
    } catch (e) { toast.error(`Speichern fehlgeschlagen: ${e.message || ''}`); }
    finally { setSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editAngebot ? 'Angebot bearbeiten' : 'Neues Angebot'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2 items-end">
            <div className="flex-1">
              <Label>Nummer</Label>
              <Input value={form.nummer} readOnly placeholder="Wird generiert..." />
            </div>
            <Button type="button" variant="outline" onClick={generateNummer} className="shrink-0">Generieren</Button>
          </div>
          <div>
            <Label>Firma *</Label>
            <Select value={form.firma_id} onValueChange={(v) => setForm(f => ({ ...f, firma_id: v }))}>
              <SelectTrigger><SelectValue placeholder="Firma wählen" /></SelectTrigger>
              <SelectContent>{firmen.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <Label>Projekt (optional)</Label>
            <Select value={form.projekt_id || 'none'} onValueChange={(v) => setForm(f => ({ ...f, projekt_id: v === 'none' ? '' : v }))}>
              <SelectTrigger><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Kein Projekt</SelectItem>
                {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Betreff *</Label>
            <Input value={form.betreff} onChange={(e) => setForm(f => ({ ...f, betreff: e.target.value }))} placeholder="z.B. Statik Wohnbau..." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Datum</Label>
              <Input type="date" value={form.datum} onChange={(e) => setForm(f => ({ ...f, datum: e.target.value }))} />
            </div>
            <div>
              <Label>Gültig bis</Label>
              <Input type="date" value={form.gueltig_bis} onChange={(e) => setForm(f => ({ ...f, gueltig_bis: e.target.value }))} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Betrag Netto (€)</Label>
              <Input type="number" step="0.01" value={form.betrag_netto} onChange={(e) => handleNettoChange(e.target.value)} />
            </div>
            <div>
              <Label>Betrag Brutto (€)</Label>
              <Input type="number" step="0.01" value={form.betrag_brutto} onChange={(e) => setForm(f => ({ ...f, betrag_brutto: Number(e.target.value) || 0 }))} />
            </div>
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v) => setForm(f => ({ ...f, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {['Entwurf', 'Verschickt', 'Angenommen', 'Abgelehnt', 'Archiviert'].map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>sevdesk ID</Label>
            <Input value={form.sevdesk_id} onChange={(e) => setForm(f => ({ ...f, sevdesk_id: e.target.value }))} placeholder="Optional — für sevdesk Deep-Link" />
          </div>
          <div>
            <Label>PDF hochladen</Label>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => document.getElementById('angebot-pdf-upload')?.click()} disabled={uploading} className="gap-2">
                {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                {form.pdf_url ? 'PDF ersetzen' : 'PDF wählen'}
              </Button>
              {form.pdf_url && <FileText className="w-4 h-4 text-brand" />}
              <input id="angebot-pdf-upload" type="file" accept="application/pdf" onChange={handleUploadPdf} className="hidden" />
            </div>
          </div>
          <div>
            <Label>Notizen</Label>
            <Textarea value={form.notizen} onChange={(e) => setForm(f => ({ ...f, notizen: e.target.value }))} rows={2} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Abbrechen</Button>
          <Button onClick={handleSubmit} disabled={saving} className="bg-brand hover:bg-brand/90 text-white gap-2">
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            {editAngebot ? 'Speichern' : 'Erstellen'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}