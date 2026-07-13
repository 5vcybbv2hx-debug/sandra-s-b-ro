import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { toast } from 'sonner';

export default function ProjektAbrechnung({ projekt, onUpdate }) {
  const [eintraege, setEintraege] = useState([]);
  const [loading, setLoading] = useState(true);
  const [istAbgerechnet, setIstAbgerechnet] = useState(projekt.ist_abgerechnet);
  const [notizen, setNotizen] = useState(projekt.notizen || '');

  useEffect(() => {
    loadEintraege();
  }, [projekt.id]);

  const loadEintraege = async () => {
    try {
      const data = await base44.entities.Zeiteintrag.filter({ projekt_id: projekt.id }, '-datum', 500);
      setEintraege(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const gesamtStunden = eintraege.reduce((sum, e) => sum + (e.stunden || 0), 0);
  const isStunden = projekt.abrechnungsart === 'Stündlich';
  const gesamtBetrag = isStunden ? gesamtStunden * projekt.stundensatz : projekt.pauschalbetrag;

  const toggleAbgerechnet = async () => {
    const newVal = !istAbgerechnet;
    setIstAbgerechnet(newVal);
    try {
      await base44.entities.Projekt.update(projekt.id, { ist_abgerechnet: newVal });
      toast.success(newVal ? 'Als abgerechnet markiert' : 'Abrechnung zurückgesetzt');
      onUpdate();
    } catch (e) {
      toast.error('Fehler');
      setIstAbgerechnet(!newVal);
    }
  };

  const saveNotizen = async () => {
    try {
      await base44.entities.Projekt.update(projekt.id, { notizen });
      toast.success('Notiz gespeichert');
      onUpdate();
    } catch (e) {
      toast.error('Fehler');
    }
  };

  return (
    <div className="space-y-6">
      <Card className="p-5 shadow-sm">
        <h3 className="font-semibold mb-4">Abrechnungsübersicht</h3>
        <div className="space-y-3">
          <div className="flex justify-between py-2 border-b border-border">
            <span className="text-muted-foreground">Abrechnungsart</span>
            <span className="font-medium">{projekt.abrechnungsart}</span>
          </div>
          {isStunden && (
            <>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Stundensatz</span>
                <span className="font-medium">{formatCurrency(projekt.stundensatz)} / h</span>
              </div>
              <div className="flex justify-between py-2 border-b border-border">
                <span className="text-muted-foreground">Geleistete Stunden</span>
                <span className="font-medium">{gesamtStunden.toFixed(2)} h</span>
              </div>
            </>
          )}
          <div className="flex justify-between py-3 bg-cardbg rounded-xl px-4">
            <span className="font-semibold">Gesamtbetrag</span>
            <span className="font-bold text-brand-dark text-lg">{formatCurrency(gesamtBetrag)}</span>
          </div>
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <p className="font-semibold">Abgerechnet</p>
            <p className="text-sm text-muted-foreground">
              {istAbgerechnet ? 'Projekt wurde abgerechnet' : 'Noch nicht abgerechnet'}
            </p>
          </div>
          <Switch checked={istAbgerechnet} onCheckedChange={toggleAbgerechnet} />
        </div>
      </Card>

      <Card className="p-5 shadow-sm">
        <Label>Abrechnungs-Notiz / sevdesk-Referenz</Label>
        <Textarea
          value={notizen}
          onChange={(e) => setNotizen(e.target.value)}
          rows={4}
          placeholder="z.B. Rechnungsnummer, sevdesk-ID..."
          className="mt-2"
        />
        <Button onClick={saveNotizen} variant="outline" className="min-h-[48px] w-full mt-3">
          Notiz speichern
        </Button>
      </Card>
    </div>
  );
}