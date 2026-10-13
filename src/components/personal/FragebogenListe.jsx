import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { downloadFragebogenPdf } from '@/lib/fragebogenPdf';

export default function FragebogenListe() {
  const [items, setItems] = useState(null);

  useEffect(() => {
    base44.entities.Personalfragebogen.filter({}, { sort: '-updated_date', limit: 50 }).then((p) => setItems(p.items));
  }, []);

  if (!items) return <p className="text-muted-foreground text-center py-8">Lade...</p>;
  if (items.length === 0) return <p className="text-muted-foreground text-center py-8">Noch keine Personalfragebögen ausgefüllt.</p>;

  return (
    <div className="space-y-2">
      {items.map((f) => (
        <Card key={f.id} className="p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="font-semibold truncate">{f.name}</p>
            <p className="text-sm text-muted-foreground">
              {f.status === 'Eingereicht' ? `Eingereicht am ${new Date(f.eingereicht_am).toLocaleDateString('de-DE')}` : 'Entwurf – noch nicht abgeschickt'}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={() => downloadFragebogenPdf(f)} className="min-h-[44px]">
            <Download className="w-4 h-4" /> PDF
          </Button>
        </Card>
      ))}
    </div>
  );
}