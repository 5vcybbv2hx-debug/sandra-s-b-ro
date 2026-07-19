import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';
import { Trash2, Info } from 'lucide-react';

function splitDateTime(iso) {
  if (!iso) return { date: '', time: '' };
  const dt = new Date(iso);
  return { date: dt.toISOString().split('T')[0], time: dt.toTimeString().slice(0, 5) };
}

function combineDateTime(dateStr, timeStr) {
  if (!dateStr) return null;
  return new Date(`${dateStr}T${timeStr || '09:00'}`).toISOString();
}

export default function TerminDialog({ open, onOpenChange, mode, event, projekte, onSaved }) {
  const [subject, setSubject] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endDate, setEndDate] = useState('');
  const [endTime, setEndTime] = useState('10:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [location, setLocation] = useState('');
  const [body, setBody] = useState('');
  const [projektId, setProjektId] = useState('');
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (event) {
      setSubject(event.subject || '');
      const s = splitDateTime(event.start_datetime);
      const e = splitDateTime(event.end_datetime);
      setStartDate(s.date); setStartTime(s.time || '09:00');
      setEndDate(e.date || s.date); setEndTime(e.time || '10:00');
      setIsAllDay(event.is_all_day || false);
      setLocation(event.location || '');
      setBody(event.body_preview || '');
      setProjektId(event.projekt_id || '');
    } else {
      const today = new Date().toISOString().split('T')[0];
      setSubject(''); setStartDate(today); setStartTime('09:00'); setEndDate(today); setEndTime('10:00');
      setIsAllDay(false); setLocation(''); setBody(''); setProjektId('');
    }
  }, [open, event]);

  const isView = mode === 'view';

  const handleSave = async () => {
    if (!subject.trim() || !startDate) return;
    setSaving(true);
    try {
      const startDT = isAllDay ? new Date(`${startDate}T00:00`).toISOString() : combineDateTime(startDate, startTime);
      const endDT = isAllDay ? new Date(`${startDate}T23:59`).toISOString() : combineDateTime(endDate || startDate, endTime);

      if (mode === 'create') {
        const res = await base44.functions.invoke('pushEventToOutlook', {
          subject, start_datetime: startDT, end_datetime: endDT,
          body, location, is_all_day: isAllDay, projekt_id: projektId || null
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success('Termin erstellt und nach Outlook gepusht');
      } else if (mode === 'edit') {
        const res = await base44.functions.invoke('updateOutlookEvent', {
          kalender_event_id: event.id, subject, start_datetime: startDT, end_datetime: endDT,
          body, location, is_all_day: isAllDay
        });
        if (res.data?.error) throw new Error(res.data.error);
        toast.success('Termin aktualisiert');
      }
      onOpenChange(false);
      onSaved();
    } catch (e) { toast.error(e.message || 'Fehler beim Speichern'); }
    finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!event) return;
    setDeleting(true);
    try {
      const res = await base44.functions.invoke('deleteOutlookEvent', { kalender_event_id: event.id });
      if (res.data?.error) throw new Error(res.data.error);
      toast.success('Termin gelöscht');
      onOpenChange(false);
      onSaved();
    } catch (e) { toast.error(e.message || 'Fehler beim Löschen'); }
    finally { setDeleting(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isView ? 'Termin (Outlook)' : mode === 'create' ? 'Neuer Termin' : 'Termin bearbeiten'}</DialogTitle>
        </DialogHeader>
        {isView && (
          <div className="flex items-center gap-2 p-2 bg-blue-50 text-blue-700 rounded-lg text-xs">
            <Info className="w-4 h-4 shrink-0" /> In Outlook bearbeiten — hier nur lesbar
          </div>
        )}
        <div className="space-y-3">
          <div>
            <Label>Titel</Label>
            <Input value={subject} onChange={e => setSubject(e.target.value)} disabled={isView} className="min-h-[48px]" />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox checked={isAllDay} onCheckedChange={setIsAllDay} disabled={isView} id="allday" />
            <Label htmlFor="allday" className="cursor-pointer">Ganztägig</Label>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Startdatum</Label>
              <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} disabled={isView} className="min-h-[48px]" />
            </div>
            {!isAllDay && (
              <div>
                <Label>Startzeit</Label>
                <Input type="time" value={startTime} onChange={e => setStartTime(e.target.value)} disabled={isView} className="min-h-[48px]" />
              </div>
            )}
          </div>
          {!isAllDay && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label>Enddatum</Label>
                <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} disabled={isView} className="min-h-[48px]" />
              </div>
              <div>
                <Label>Endzeit</Label>
                <Input type="time" value={endTime} onChange={e => setEndTime(e.target.value)} disabled={isView} className="min-h-[48px]" />
              </div>
            </div>
          )}
          <div>
            <Label>Ort</Label>
            <Input value={location} onChange={e => setLocation(e.target.value)} disabled={isView} className="min-h-[48px]" placeholder="z.B. Büro, Baustelle..." />
          </div>
          <div>
            <Label>Beschreibung</Label>
            <Textarea value={body} onChange={e => setBody(e.target.value)} disabled={isView} className="min-h-[60px]" rows={2} />
          </div>
          {!isView && (
            <div>
              <Label>Projekt (optional)</Label>
              <Select value={projektId || '_none'} onValueChange={v => setProjektId(v === '_none' ? '' : v)}>
                <SelectTrigger className="min-h-[48px]"><SelectValue placeholder="Kein Projekt" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Kein Projekt</SelectItem>
                  {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
          {isView && event?.projekt_id && (
            <div><Label>Projekt</Label><p className="text-sm py-2">{projekte.find(p => p.id === event.projekt_id)?.projekt_name || '—'}</p></div>
          )}
        </div>
        <DialogFooter className="flex gap-2">
          {mode === 'edit' && (
            <Button variant="destructive" onClick={handleDelete} disabled={deleting} className="min-h-[48px]">
              <Trash2 className="w-4 h-4" /> {deleting ? '...' : 'Löschen'}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)} className="min-h-[48px] flex-1">{isView ? 'Schließen' : 'Abbrechen'}</Button>
          {!isView && (
            <Button onClick={handleSave} disabled={!subject.trim() || !startDate || saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] flex-1">
              {saving ? 'Speichert...' : 'Speichern'}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}