import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, Check, ShoppingBag, AlertCircle, Trash2 } from 'lucide-react';
import { todayISO } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const KATEGORIEN = ['Büromaterial', 'Plotter/Papier', 'Druck/Tinte', 'Werkzeug', 'Sonstiges'];
const KATEGORIE_ICONS = {
  'Büromaterial': Package,
  'Plotter/Papier': Package,
  'Druck/Tinte': Package,
  'Werkzeug': Package,
  'Sonstiges': Package,
};

export default function Bestellliste() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newItem, setNewItem] = useState({
    titel: '', kategorie: 'Büromaterial', menge: '', prioritaet: 'Normal', notizen: ''
  });

  useEffect(() => { loadItems(); }, []);

  const loadItems = async () => {
    try {
      const data = await base44.entities.Bestellliste.list('-created_date', 200);
      setItems(data);
    } catch (e) {
      console.error(e);
      toast.error('Bestellliste konnte nicht geladen werden');
    } finally { setLoading(false); }
  };

  const addItem = async () => {
    if (!newItem.titel.trim()) return;
    try {
      await base44.entities.Bestellliste.create({
        titel: newItem.titel,
        kategorie: newItem.kategorie,
        menge: newItem.menge || '1 Stück',
        prioritaet: newItem.prioritaet,
        notizen: newItem.notizen,
        status: 'Offen',
      });
      setNewItem({ titel: '', kategorie: 'Büromaterial', menge: '', prioritaet: 'Normal', notizen: '' });
      setShowForm(false);
      toast.success('Material hinzugefügt');
      loadItems();
    } catch (e) {
      toast.error('Konnte nicht speichern');
    }
  };

  const markBestellt = async (item) => {
    await base44.entities.Bestellliste.update(item.id, {
      status: 'Bestellt',
      bestellt_am: todayISO(),
    });
    toast.success(`"${item.titel}" als bestellt markiert`);
    loadItems();
  };

  const markGeliefert = async (item) => {
    await base44.entities.Bestellliste.update(item.id, {
      status: 'Geliefert',
      geliefert_am: todayISO(),
    });
    toast.success(`"${item.titel}" geliefert ✓`);
    loadItems();
  };

  const deleteItem = async (item) => {
    await base44.entities.Bestellliste.delete(item.id);
    loadItems();
  };

  const offen = items.filter(i => i.status === 'Offen');
  const bestellt = items.filter(i => i.status === 'Bestellt');
  const geliefert = items.filter(i => i.status === 'Geliefert');

  const renderItem = (item) => {
    const isDringend = item.prioritaet === 'Dringend';
    return (
      <Card key={item.id} className={cn('p-4 shadow-sm', isDringend && item.status === 'Offen' && 'border-amber-300 bg-amber-50/50')}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isDringend && item.status === 'Offen' && <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />}
              <p className="font-semibold truncate">{item.titel}</p>
            </div>
            <div className="flex items-center gap-2 mt-1 flex-wrap">
              <span className="text-sm text-muted-foreground">{item.menge}</span>
              <span className="text-xs text-muted-foreground/70">·</span>
              <span className="text-xs bg-muted px-2 py-0.5 rounded-full">{item.kategorie}</span>
              {item.notizen && <span className="text-xs text-muted-foreground/70 truncate">· {item.notizen}</span>}
            </div>
            {item.status === 'Bestellt' && item.bestellt_am && (
              <p className="text-xs text-muted-foreground mt-1">Bestellt am {new Date(item.bestellt_am).toLocaleDateString('de-DE')}</p>
            )}
            {item.status === 'Geliefert' && item.geliefert_am && (
              <p className="text-xs text-muted-foreground mt-1">Geliefert am {new Date(item.geliefert_am).toLocaleDateString('de-DE')}</p>
            )}
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {item.status === 'Offen' && (
              <button
                onClick={() => markBestellt(item)}
                className="w-9 h-9 rounded-lg bg-brand-light text-brand-dark hover:bg-brand hover:text-white flex items-center justify-center transition-colors"
                aria-label="Als bestellt markieren"
                title="Als bestellt markieren"
              >
                <ShoppingBag className="w-4 h-4" />
              </button>
            )}
            {item.status === 'Bestellt' && (
              <button
                onClick={() => markGeliefert(item)}
                className="w-9 h-9 rounded-lg bg-green-100 text-green-700 hover:bg-green-600 hover:text-white flex items-center justify-center transition-colors"
                aria-label="Als geliefert markieren"
                title="Als geliefert markieren"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
            <button
              onClick={() => deleteItem(item)}
              className="w-9 h-9 rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 flex items-center justify-center transition-colors"
              aria-label="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>
    );
  };

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl md:text-2xl font-bold">Bestellliste</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {offen.length > 0 ? `${offen.length} offen` : 'Alles bestellt ✓'}
            {bestellt.length > 0 && ` · ${bestellt.length} bestellt`}
          </p>
        </div>
        {!showForm && (
          <Button
            onClick={() => setShowForm(true)}
            className="bg-brand hover:bg-brand-dark text-white min-h-[44px]"
          >
            <Plus className="w-4 h-4 mr-1" /> Material
          </Button>
        )}
      </div>

      {/* Quick Add Form */}
      {showForm && (
        <Card className="p-5 shadow-sm space-y-3">
          <Input
            value={newItem.titel}
            onChange={(e) => setNewItem({ ...newItem, titel: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && addItem()}
            placeholder="Was wird gebraucht? (z.B. Plotterpapier A0, Tinte Cyan)"
            className="min-h-[48px]"
            autoFocus
          />
          <div className="grid grid-cols-2 gap-3">
            <Select value={newItem.kategorie} onValueChange={(v) => setNewItem({ ...newItem, kategorie: v })}>
              <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {KATEGORIEN.map(k => <SelectItem key={k} value={k}>{k}</SelectItem>)}
              </SelectContent>
            </Select>
            <Input
              value={newItem.menge}
              onChange={(e) => setNewItem({ ...newItem, menge: e.target.value })}
              placeholder="Menge (z.B. 2 Rollen)"
              className="min-h-[48px]"
            />
          </div>
          <Select value={newItem.prioritaet} onValueChange={(v) => setNewItem({ ...newItem, prioritaet: v })}>
            <SelectTrigger className="min-h-[48px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="Normal">Normal</SelectItem>
              <SelectItem value="Dringend">Dringend</SelectItem>
            </SelectContent>
          </Select>
          <Textarea
            value={newItem.notizen}
            onChange={(e) => setNewItem({ ...newItem, notizen: e.target.value })}
            placeholder="Notizen (z.B. Artikelnummer, Lieferant, Link)"
            className="min-h-[60px]"
          />
          <div className="flex gap-2">
            <Button onClick={addItem} className="bg-brand hover:bg-brand-dark text-white min-h-[44px] flex-1">
              Hinzufügen
            </Button>
            <Button
              variant="outline"
              onClick={() => { setShowForm(false); setNewItem({ titel: '', kategorie: 'Büromaterial', menge: '', prioritaet: 'Normal', notizen: '' }); }}
              className="min-h-[44px]"
            >
              Abbrechen
            </Button>
          </div>
        </Card>
      )}

      {/* Offen */}
      {offen.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Offen</h2>
          <div className="space-y-2">{offen.map(renderItem)}</div>
        </div>
      )}

      {/* Bestellt */}
      {bestellt.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-muted-foreground px-1 mb-2">Bestellt</h2>
          <div className="space-y-2">{bestellt.map(renderItem)}</div>
        </div>
      )}

      {/* Geliefert (eingeklappt, nur letzte 5) */}
      {geliefert.length > 0 && (
        <details className="mt-4">
          <summary className="text-sm font-medium text-muted-foreground px-1 mb-2 cursor-pointer">
            Geliefert ({geliefert.length})
          </summary>
          <div className="space-y-2 mt-2">{geliefert.slice(0, 5).map(renderItem)}</div>
        </details>
      )}

      {!loading && items.length === 0 && !showForm && (
        <div className="text-center py-12">
          <Package className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
          <p className="text-muted-foreground">Noch nichts auf der Liste.</p>
          <p className="text-muted-foreground text-sm mt-1">Wenn Material zur Neige geht, einfach hier eintragen.</p>
        </div>
      )}
    </div>
  );
}
