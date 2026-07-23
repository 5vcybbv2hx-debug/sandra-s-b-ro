import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LayoutTemplate, Plus, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import VorlageFormModal from '@/components/vorlagen/VorlageFormModal';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

const ART_STYLES = {
  Wohnbau: 'bg-brand-light text-brand-dark',
  Gewerbebau: 'bg-accent/10 text-accent',
  'Öffentliches Bauvorhaben': 'bg-blue-50 text-blue-700',
  'Umbau/Sanierung': 'bg-amber-50 text-amber-700',
  Sonstiges: 'bg-gray-100 text-gray-600',
};

export default function Vorlagen() {
  const [vorlagen, setVorlagen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editItem, setEditItem] = useState(null);

  useEffect(() => { load(); }, []);

  const load = async () => {
    try { setVorlagen(await base44.entities.ProjektVorlage.list('-name', 200)); }
    catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const handleDelete = async (item) => {
    if (!confirm(`Vorlage "${item.name}" löschen?`)) return;
    try { await base44.entities.ProjektVorlage.delete(item.id); toast.success('Gelöscht'); load(); }
    catch { toast.error('Löschen fehlgeschlagen'); }
  };

  const totalStunden = (v) =>
    (v.geschaetzte_stunden_entwurf || 0) + (v.geschaetzte_stunden_baugesuch || 0) + (v.geschaetzte_stunden_werkplanung || 0);

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Vorlagen</h1>
          <p className="text-sm text-muted-foreground">{vorlagen.length} Vorlagen</p>
        </div>
        <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="bg-brand hover:bg-brand-dark text-white gap-2">
          <Plus className="w-4 h-4" /> Neu
        </Button>
      </div>

      {loading ? <p className="text-center py-8 text-muted-foreground">Lade...</p> :
       vorlagen.length === 0 ? (
        <Card className="p-8 border-dashed text-center">
          <LayoutTemplate className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
          <p className="font-medium">Noch keine Vorlagen erfasst</p>
          <p className="text-sm text-muted-foreground mt-1">erstellen Sie Vorlagen für Wohnbau, Gewerbebau etc.</p>
          <Button onClick={() => { setEditItem(null); setShowForm(true); }} className="mt-4 bg-brand hover:bg-brand-dark text-white gap-2">
            <Plus className="w-4 h-4" /> Erstellen
          </Button>
        </Card>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {vorlagen.map(v => (
            <Card key={v.id} className="p-4 space-y-3 min-h-[48px] h-full">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium truncate">{v.name}</p>
                  <span className={cn('inline-block text-xs font-medium px-2 py-0.5 rounded-full mt-1', ART_STYLES[v.projektart] || ART_STYLES.Sonstiges)}>
                    {v.projektart}
                  </span>
                </div>
                <div className="flex gap-1 shrink-0">
                  <Button size="icon" variant="ghost" onClick={() => { setEditItem(v); setShowForm(true); }} className="h-8 w-8"><Edit className="w-4 h-4" /></Button>
                  <Button size="icon" variant="ghost" onClick={() => handleDelete(v)} className="h-8 w-8 text-destructive"><Trash2 className="w-4 h-4" /></Button>
                </div>
              </div>
              <div className="flex items-center gap-3 text-sm text-muted-foreground">
                <span>{v.abrechnungsart}</span>
                {v.abrechnungsart === 'Stündlich' && <span>{formatCurrency(v.standard_stundensatz)}/h</span>}
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="text-muted-foreground">Geschätzt:</span>
                <span className="font-medium">{totalStunden(v)} h</span>
              </div>
              {v.beschreibung && <p className="text-xs text-muted-foreground truncate">{v.beschreibung}</p>}
            </Card>
          ))}
        </div>
      )}

      {showForm && <VorlageFormModal onClose={() => setShowForm(false)} onSaved={load} editItem={editItem} />}
    </div>
  );
}