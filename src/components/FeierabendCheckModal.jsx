import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { useTimer } from '@/lib/TimerContext';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ITEMS = [
  { key: 'aufgaben_dokumentiert', label: 'Alle Aufgaben dokumentiert?' },
  { key: 'timer_gestoppt', label: 'Timer gestoppt?' },
  { key: 'telefonnotizen_vollstaendig', label: 'Alle Telefonate notiert?' },
  { key: 'morgen_geplant', label: 'Morgen geplant?' },
  { key: 'arbeitsplatz_aufgeraeumt', label: 'Arbeitsplatz aufgeräumt?' },
];

export default function FeierabendCheckModal({ open, onClose }) {
  const { activeTimer, project, stopTimer } = useTimer();
  const [checks, setChecks] = useState({ aufgaben_dokumentiert: false, timer_gestoppt: false, telefonnotizen_vollstaendig: false, morgen_geplant: false, arbeitsplatz_aufgeraeumt: false });
  const [notiz, setNotiz] = useState('');
  const [stundenHeute, setStundenHeute] = useState(0);
  const [done, setDone] = useState(false);
  const [existingId, setExistingId] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setDone(false); setNotiz('');
      const today = todayISO();
      base44.entities.Zeiteintrag.filter({ datum: today }).then(z => { setStundenHeute(z.filter(x => !x.timer_laeuft).reduce((s, e) => s + (e.stunden || 0), 0)); }).catch(() => {});
      base44.entities.FeierabendCheck.filter({ datum: today }).then(checks => { const c = checks[0]; if (c) { setExistingId(c.id); setChecks({ aufgaben_dokumentiert: c.aufgaben_dokumentiert, timer_gestoppt: c.timer_gestoppt, telefonnotizen_vollstaendig: c.telefonnotizen_vollstaendig, morgen_geplant: c.morgen_geplant, arbeitsplatz_aufgeraeumt: c.arbeitsplatz_aufgeraeumt }); setNotiz(c.notiz || ''); } else { setExistingId(null); setChecks({ aufgaben_dokumentiert: false, timer_gestoppt: false, telefonnotizen_vollstaendig: false, morgen_geplant: false, arbeitsplatz_aufgeraeumt: false }); } }).catch(() => {});
    }
  }, [open]);

  const toggle = (key) => setChecks(prev => ({ ...prev, [key]: !prev[key] }));

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = { datum: todayISO(), ...checks, notiz, stunden_heute: stundenHeute, bewertung: 'erledigt' };
      if (existingId) await base44.entities.FeierabendCheck.update(existingId, payload);
      else await base44.entities.FeierabendCheck.create(payload);
      setDone(true);
    } catch (e) { toast.error('Fehler'); } finally { setSaving(false); }
  };

  if (done) return (<Dialog open={open} onOpenChange={onClose}><DialogContent className="max-w-sm"><div className="text-center py-8"><p className="text-6xl mb-4">👋</p><h2 className="text-2xl font-bold mb-2">Schönen Feierabend, Sandra!</h2><p className="text-muted-foreground">Du hast heute {stundenHeute.toFixed(1)} Stunden gearbeitet.</p><Button onClick={onClose} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] mt-6 w-full">Danke!</Button></div></DialogContent></Dialog>);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader><DialogTitle>🌙 Feierabend-Check</DialogTitle></DialogHeader>
        {activeTimer && (<div className="p-3 bg-amber-50 border-2 border-amber-200 rounded-xl mb-4"><p className="text-sm font-medium text-amber-700">Timer läuft noch für {project?.projekt_name || 'Projekt'} — zuerst stoppen?</p><Button onClick={stopTimer} className="bg-amber-500 hover:bg-amber-600 text-white min-h-[40px] mt-2 w-full">Timer stoppen</Button></div>)}
        <div className="space-y-2">
          {ITEMS.map(item => <div key={item.key} className="flex items-center justify-between p-3 bg-cardbg rounded-xl min-h-[48px]"><Label className="cursor-pointer text-sm">{item.label}</Label><Switch checked={checks[item.key]} onCheckedChange={() => toggle(item.key)} /></div>)}
        </div>
        <div className="p-3 bg-brand-light rounded-xl"><p className="text-sm text-brand-dark">Heute gearbeitet: <b>{stundenHeute.toFixed(1)} h</b></p></div>
        <div><Label>Notiz für morgen</Label><Textarea value={notiz} onChange={e => setNotiz(e.target.value)} rows={2} placeholder="Was steht morgen an?" /></div>
        <DialogFooter><Button onClick={handleSave} disabled={saving} className="bg-brand hover:bg-brand-dark text-white min-h-[48px] w-full">{saving ? 'Speichert...' : 'Feierabend! 🌙'}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}