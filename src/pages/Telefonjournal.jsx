import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Check, Trash2 } from 'lucide-react';
import { formatDateTime, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function Telefonjournal() {
  const [notizen, setNotizen] = useState([]);
  const [projekte, setProjekte] = useState([]);
  const [firmen, setFirmen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('offen');

  useEffect(() => { loadData(); }, []);
  const loadData = async () => { try { const [n, p, f] = await Promise.all([base44.entities.Telefonnotiz.list('-datum', 200), base44.entities.Projekt.list('-updated_date', 200), base44.entities.Firma.list('-name', 200)]); setNotizen(n); setProjekte(p); setFirmen(f); } catch (e) { console.error(e); } finally { setLoading(false); } };

  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '';
  const firmaForNote = (n) => { if (n.ansprechpartner_id) { const ap = notizen.find((x) => x.ansprechpartner_id === n.ansprechpartner_id); } return ''; };
  const firmaName = (fid) => firmen.find((f) => f.id === fid)?.name || '';

  let filtered = notizen;
  if (filter === 'offen') filtered = notizen.filter((n) => !n.erledigt);
  else if (filter === 'erledigt') filtered = notizen.filter((n) => n.erledigt);

  const toggleErledigt = async (n) => { await base44.entities.Telefonnotiz.update(n.id, { erledigt: !n.erledigt }); loadData(); };
  const handleDelete = async (id) => { await base44.entities.Telefonnotiz.delete(id); loadData(); };

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-5">
      <div className="flex items-center justify-between"><h1 className="text-2xl md:text-3xl font-bold">Telefon-Journal</h1><Select value={filter} onValueChange={setFilter}><SelectTrigger className="w-40 min-h-[48px]"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">Alle</SelectItem><SelectItem value="offen">Offen</SelectItem><SelectItem value="erledigt">Erledigt</SelectItem></SelectContent></Select></div>
      {loading ? <p className="text-muted-foreground text-center py-8">Lade...</p> : (
        <div className="space-y-3">
          {filtered.map((n) => { const proj = projekte.find((p) => p.id === n.projekt_id); return (
            <Card key={n.id} className={cn('p-4 shadow-sm', n.erledigt && 'opacity-60')}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap"><p className="font-medium">{n.kontakt_name}</p>{n.typ === 'Eingehend' ? <span className="text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">Eingehend</span> : <span className="text-xs bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full">Ausgehend</span>}</div>
                  <p className="text-xs text-muted-foreground mt-0.5">{formatDateTime(n.datum)}</p>
                  {proj && <Link to={`/projekte/${proj.id}`} className="text-xs text-brand hover:underline">{proj.projekt_name}</Link>}
                  <p className="text-sm mt-1">{n.besprochen}</p>
                  {n.naechster_schritt && <p className="text-sm font-medium text-accent mt-1">→ {n.naechster_schritt}</p>}
                  {n.termin && <p className="text-xs text-muted-foreground mt-1">Termin: {formatDate(n.termin)}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button onClick={() => toggleErledigt(n)} className={cn('w-6 h-6 rounded-full border-2 flex items-center justify-center', n.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : 'border-border')}>{n.erledigt && <Check className="w-4 h-4 text-white" />}</button>
                  <button onClick={() => handleDelete(n.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              </div>
            </Card>
          ); })}
          {filtered.length === 0 && <p className="text-muted-foreground text-center py-12">Keine Telefonnotizen.</p>}
        </div>
      )}
    </div>
  );
}

import { Link } from 'react-router-dom';