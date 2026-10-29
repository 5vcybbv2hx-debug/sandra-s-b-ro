import { Card } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';
import { formatDate } from '@/lib/format';
import PersonSelect from '@/components/zeiten/PersonSelect';

export default function OhnePersonListe({ eintraege = [], mitarbeiter = [], projName, onAssign }) {
  if (!eintraege.length) return null;

  return (
    <Card className="p-4 shadow-sm border-amber-200 bg-amber-50/40">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
        <p className="text-sm font-semibold text-amber-700">
          {eintraege.length} Einträge ohne Personenzuordnung
        </p>
      </div>
      <div className="space-y-2">
        {eintraege.map((e) => (
          <div key={e.id} className="flex flex-col sm:flex-row sm:items-center gap-2 bg-white rounded-lg p-2 border border-amber-100">
            <div className="min-w-0 flex-1 text-sm">
              <span className="text-muted-foreground">{formatDate(e.datum)}</span>
              <span className="mx-1.5">·</span>
              <span className="font-medium">{projName(e.projekt_id)}</span>
              <span className="mx-1.5">·</span>
              <span>{e.stunden} h</span>
              {e.beschreibung && <span className="text-muted-foreground"> · {e.beschreibung}</span>}
            </div>
            <PersonSelect
              mitarbeiter={mitarbeiter}
              value={e.mitarbeiter_id}
              onValueChange={(v) => onAssign(e.id, v)}
              placeholder="Person zuordnen"
              className="sm:w-48 min-h-[40px]"
            />
          </div>
        ))}
      </div>
    </Card>
  );
}