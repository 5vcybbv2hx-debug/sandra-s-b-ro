import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Phone, Check, Trash2 } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function Telefonjournal() {
  const [notizen, setNotizen] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('offen');

  useEffect(() => {
    loadNotizen();
  }, []);

  const loadNotizen = async () => {
    try {
      const data = await base44.entities.Telefonnotiz.list('-datum', 200);
      setNotizen(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleErledigt = async (note) => {
    await base44.entities.Telefonnotiz.update(note.id, { erledigt: !note.erledigt, heute_anrufen: false });
    loadNotizen();
  };

  const handleDelete = async (id) => {
    await base44.entities.Telefonnotiz.delete(id);
    loadNotizen();
  };

  let filtered = notizen;
  if (filter === 'offen') filtered = notizen.filter((n) => !n.erledigt);
  else if (filter === 'erledigt') filtered = notizen.filter((n) => n.erledigt);
  else if (filter === 'termin') filtered = notizen.filter((n) => n.termin);

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl md:text-3xl font-bold mb-6">Telefonjournal</h1>

      <Select value={filter} onValueChange={setFilter}>
        <SelectTrigger className="w-full md:w-64 min-h-[48px] mb-6">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="alle">Alle</SelectItem>
          <SelectItem value="offen">Offen</SelectItem>
          <SelectItem value="erledigt">Erledigt</SelectItem>
          <SelectItem value="termin">Mit Termin</SelectItem>
        </SelectContent>
      </Select>

      {loading ? (
        <p className="text-muted-foreground text-center py-8">Lade...</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((note) => (
            <Card
              key={note.id}
              className={cn('p-4 shadow-sm', note.erledigt && 'opacity-50')}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 min-w-0">
                  <Phone className="w-4 h-4 text-accent shrink-0" />
                  <div className="min-w-0">
                    <p className="font-medium truncate">{note.kontakt_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(note.datum)}
                      {note.typ === 'Ausgehend' ? ' · ausgehend' : ' · eingehend'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => toggleErledigt(note)}
                    className={cn(
                      'w-6 h-6 rounded-full border-2 flex items-center justify-center',
                      note.erledigt ? 'bg-status-abgeschlossen border-status-abgeschlossen' : 'border-border'
                    )}
                  >
                    {note.erledigt && <Check className="w-3.5 h-3.5 text-white" />}
                  </button>
                  <button
                    onClick={() => handleDelete(note.id)}
                    className="text-muted-foreground hover:text-destructive p-1"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              {note.besprochen && (
                <p className="text-sm mt-2 line-clamp-2">{note.besprochen}</p>
              )}
              {note.naechster_schritt && (
                <div className="mt-2 p-2 bg-cardbg rounded-lg">
                  <p className="text-xs text-muted-foreground">Nächster Schritt:</p>
                  <p className="text-sm font-medium">{note.naechster_schritt}</p>
                </div>
              )}
              {note.termin && (
                <p className="text-xs text-accent mt-2">📅 Termin: {note.termin}</p>
              )}
            </Card>
          ))}
          {filtered.length === 0 && (
            <p className="text-muted-foreground text-center py-12">Keine Telefonnotizen.</p>
          )}
        </div>
      )}
    </div>
  );
}