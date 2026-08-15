import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Search, Check, X, Link2, FileSpreadsheet, Building2, Eye } from 'lucide-react';
import { cn } from '@/lib/utils';

const STATUS_ORDER = ['Offen', 'Zugeordnet', 'Kunde_zugeordnet', 'Nicht_zuordnenbar'];
const STATUS_LABELS = {
  Offen: 'Offen',
  Zugeordnet: 'Zugeordnet',
  Kunde_zugeordnet: 'Kunde zugeordnet',
  Nicht_zuordnenbar: 'Nicht zuordnenbar',
};
const STATUS_COLORS = {
  Offen: 'bg-amber-100 text-amber-700 border-amber-200',
  Zugeordnet: 'bg-emerald-100 text-emerald-700 border-emerald-200',
  Kunde_zugeordnet: 'bg-teal-100 text-teal-700 border-teal-200',
  Nicht_zuordnenbar: 'bg-slate-100 text-slate-500 border-slate-200',
};

export default function RechnungsMatching() {
  const [records, setRecords] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [notizDraft, setNotizDraft] = useState({});
  const [linkDraft, setLinkDraft] = useState({});
  const [stundenDraft, setStundenDraft] = useState({});
  const [firmaDraft, setFirmaDraft] = useState({});
  const [previewRechnung, setPreviewRechnung] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const [recs, pros, firms] = await Promise.all([
        base44.entities.RechnungsMatch.list('-datum', 500),
        base44.entities.Projekt.list('-projekt_name', 500),
        base44.entities.Firma.list('-name', 500),
      ]);
      setRecords(recs);
      setProjekte(pros);
      setFirmen(firms);
    } catch (e) {
      toast.error('Fehler beim Laden');
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = records.filter(r => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (r.rechnr || '').toLowerCase().includes(q) || (r.kunde || '').toLowerCase().includes(q) || (r.phase || '').toLowerCase().includes(q);
  });

  const grouped = STATUS_ORDER.map(status => ({
    status,
    items: filtered.filter(r => r.status === status),
  }));

  const openItems = records.filter(r => r.status === 'Offen');
  const offenSumme = openItems.reduce((sum, r) => sum + (Number(r.betrag) || 0), 0);
  const offenCount = openItems.length;

  const updateRecord = async (id, data) => {
    try {
      await base44.entities.RechnungsMatch.update(id, data);
      setRecords(prev => prev.map(r => r.id === id ? { ...r, ...data } : r));
    } catch (e) {
      toast.error('Speichern fehlgeschlagen');
      console.error(e);
    }
  };

  const handleLink = async (id) => {
    const projectId = linkDraft[id];
    if (!projectId) { toast.error('Bitte Projekt wählen'); return; }
    const proj = projekte.find(p => p.id === projectId);
    const stundenVal = stundenDraft[id] !== undefined && stundenDraft[id] !== '' ? Number(stundenDraft[id]) : 0;
    await updateRecord(id, { linked_project: projectId, status: 'Zugeordnet', notiz: notizDraft[id] ?? undefined, stunden: stundenVal });
    toast.success(`Verknüpft mit ${proj?.projekt_name || 'Projekt'}`);
    setLinkDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setStundenDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setFirmaDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setExpandedId(null);
  };

  const handleKundeLink = async (id) => {
    const firmaId = firmaDraft[id];
    if (!firmaId) { toast.error('Bitte Firma wählen'); return; }
    const firma = firmen.find(f => f.id === firmaId);
    await updateRecord(id, { linked_firma: firmaId, status: 'Kunde_zugeordnet', notiz: notizDraft[id] ?? undefined });
    toast.success(`Verknüpft mit ${firma?.name || 'Firma'}`);
    setFirmaDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setExpandedId(null);
  };

  const handleNicht = async (id) => {
    await updateRecord(id, { status: 'Nicht_zuordnenbar', notiz: notizDraft[id] ?? undefined });
    toast.success('Als nicht zuordnenbar markiert');
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
    setExpandedId(null);
  };

  const handleNotizSave = async (id) => {
    await updateRecord(id, { notiz: notizDraft[id] || '' });
    toast.success('Notiz gespeichert');
    setNotizDraft(prev => { const n = { ...prev }; delete n[id]; return n; });
  };

  const formatEuro = (v) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(Number(v) || 0);

  const Row = ({ r }) => {
    const isOpen = expandedId === r.id;
    const linkedProj = r.linked_project ? projekte.find(p => p.id === r.linked_project) : null;
    const linkedFirma = r.linked_firma ? firmen.find(f => f.id === r.linked_firma) : null;
    return (
      <Card className={cn('border-border', isOpen && 'ring-1 ring-brand')}>
        <CardHeader className="p-4 pb-2">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-foreground">{r.rechnr}</span>
                <Badge variant="outline" className={cn('text-xs', STATUS_COLORS[r.status])}>{STATUS_LABELS[r.status]}</Badge>
                <span className="text-xs px-2 py-0.5 rounded-full bg-cardbg text-muted-foreground">{r.phase || '—'}</span>
              </div>
              <p className="text-sm text-foreground mt-1 truncate">{r.kunde || '—'}</p>
              <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                <span>{r.datum || '—'}</span>
                <span className="font-semibold text-foreground">{formatEuro(r.betrag)}</span>
                {linkedProj && <span className="text-brand-dark flex items-center gap-1"><Link2 className="w-3 h-3" />{linkedProj.projekt_name}</span>}
                {linkedFirma && <span className="text-emerald-600 flex items-center gap-1"><Building2 className="w-3 h-3" />{linkedFirma.name}</span>}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {r.pdf_url && (
                <Button variant="ghost" size="sm" onClick={() => setPreviewRechnung(r)} className="text-brand-dark">
                  <Eye className="w-4 h-4" />Vorschau
                </Button>
              )}
              <Button variant="ghost" size="sm" onClick={() => { setExpandedId(isOpen ? null : r.id); if (!isOpen) { setLinkDraft(prev => ({ ...prev, [r.id]: r.linked_project || '' })); setNotizDraft(prev => ({ ...prev, [r.id]: r.notiz || '' })); setStundenDraft(prev => ({ ...prev, [r.id]: r.stunden ?? '' })); setFirmaDraft(prev => ({ ...prev, [r.id]: r.linked_firma || '' })); } }}>
                {isOpen ? 'Schließen' : 'Bearbeiten'}
              </Button>
            </div>
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent className="p-4 pt-2 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground">Projekt verknüpfen</label>
                <Select value={linkDraft[r.id] ?? ''} onValueChange={v => setLinkDraft(prev => ({ ...prev, [r.id]: v }))}>
                  <SelectTrigger className="min-h-[40px] mt-1"><SelectValue placeholder="Projekt wählen" /></SelectTrigger>
                  <SelectContent>
                    {projekte.map(p => <SelectItem key={p.id} value={p.id}>{p.projekt_name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground">Abgerechnete Stunden</label>
                <Input type="number" step="0.25" value={stundenDraft[r.id] ?? ''} onChange={e => setStundenDraft(prev => ({ ...prev, [r.id]: e.target.value }))} placeholder="0" className="min-h-[40px] mt-1" />
              </div>
            </div>
            <div className="border-t border-border pt-3">
              <label className="text-xs font-medium text-muted-foreground">Kunde zuordnen (ohne Projekt)</label>
              <div className="flex gap-2 mt-1">
                <Select value={firmaDraft[r.id] ?? ''} onValueChange={v => setFirmaDraft(prev => ({ ...prev, [r.id]: v }))}>
                  <SelectTrigger className="min-h-[40px] flex-1"><SelectValue placeholder="Firma wählen" /></SelectTrigger>
                  <SelectContent>
                    {firmen.map(f => <SelectItem key={f.id} value={f.id}>{f.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Button onClick={() => handleKundeLink(r.id)} disabled={!firmaDraft[r.id]} className="bg-teal-600 hover:bg-teal-700 text-white min-h-[40px]"><Building2 className="w-4 h-4" />Kunde zuordnen</Button>
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={() => handleLink(r.id)} disabled={!linkDraft[r.id]} className="bg-status-abgeschlossen hover:bg-status-abgeschlossen/90 text-white min-h-[40px] flex-1"><Check className="w-4 h-4" />Zugeordnet</Button>
              <Button onClick={() => handleNicht(r.id)} variant="outline" className="min-h-[40px]"><X className="w-4 h-4" />Nicht zuordnenbar</Button>
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground">Notiz</label>
              <div className="flex gap-2 mt-1">
                <Textarea value={notizDraft[r.id] ?? ''} onChange={e => setNotizDraft(prev => ({ ...prev, [r.id]: e.target.value }))} rows={2} placeholder="z.B. monatliche Arbeitsstunden, Storno..." />
                <Button variant="outline" onClick={() => handleNotizSave(r.id)} className="min-h-[40px] self-start">Speichern</Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>
    );
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6 space-y-5">
      <Dialog open={!!previewRechnung} onOpenChange={(open) => { if (!open) setPreviewRechnung(null); }}>
        <DialogContent className="w-full h-full max-w-none md:max-w-2xl md:h-[80vh] p-0 flex flex-col gap-0">
          <DialogHeader className="flex flex-row items-center justify-between p-4 border-b border-border space-y-0">
            <DialogTitle className="text-base">Rechnung {previewRechnung?.rechnr}</DialogTitle>
          </DialogHeader>
          <iframe src={previewRechnung?.pdf_url} className="w-full flex-1 min-h-0" title="PDF Vorschau" />
        </DialogContent>
      </Dialog>
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
          <FileSpreadsheet className="w-5 h-5 text-brand-dark" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Rechnungs-Matching</h1>
          <p className="text-sm text-muted-foreground">Rechnungen Projekten zuordnen</p>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Suche nach Rechnr, Kunde, Phase..." className="pl-9 min-h-[44px]" />
      </div>

      <Card className="bg-cardbg border-border">
        <CardContent className="p-4 flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Offene Rechnungen</p>
            <p className="text-2xl font-bold text-foreground">{offenCount}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground uppercase tracking-wide">Gesamtbetrag offen</p>
            <p className="text-2xl font-bold text-amber-600">{formatEuro(offenSumme)}</p>
          </div>
        </CardContent>
      </Card>

      {loading ? (
        <div className="text-center py-12 text-muted-foreground">Lade Rechnungen...</div>
      ) : (
        grouped.map(group => (
          <div key={group.status} className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h2 className="text-sm font-semibold text-foreground">{STATUS_LABELS[group.status]} <span className="text-muted-foreground">({group.items.length})</span></h2>
            </div>
            {group.items.length === 0 ? (
              <p className="text-xs text-muted-foreground px-1 pb-2">Keine Einträge</p>
            ) : (
              <div className="space-y-2">{group.items.map(r => <Row key={r.id} r={r} />)}</div>
            )}
          </div>
        ))
      )}
    </div>
  );
}