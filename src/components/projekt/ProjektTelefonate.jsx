import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Trash2, Check, Phone } from 'lucide-react';
import { formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

export default function ProjektTelefonate({ projekt }) {
  const [notizen, setNotizen] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNotizen();
  }, [projekt.id]);

  const loadNotizen = async () => {
    try {
      const data = await base44.entities.Telefonnotiz.filter({ projekt_id: projekt.id }, '-datum', 100);
      setNotizen(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const toggleErledigt = async (note) => {
    await base44.entities.Telefonnotiz.update(note.id, { erledigt: !note.erledigt });
    loadNotizen();
  };

  const handleDelete = async (id) => {
    await base44.entities.Telefonnotiz.delete(id);
    loadNotizen();
  };

  if (loading) return <p className="text-muted-foreground">Lade...</p>;

  return (
    <div className="space-y-3">
      {notizen.map((note) => (
        <div
          key={note.id}
          className={cn(
            'p-4 bg-cardbg rounded-2xl min-h-[48px]',
            note.erledigt && 'opacity-50'
          )}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <Phone className="w-4 h-4 text-accent shrink-0" />
              <div className="min-w-0">
                <p className="font-medium truncate">
                  {note.kontakt_name}
                  <span className="text-xs text-muted-foreground ml-2">
                    {note.typ === 'Eingehend' ? '← eingehend' : '→ ausgehend'}
                  </span>
                </p>
                <p className="text-xs text-muted-foreground">{formatDateTime(note.datum)}</p>
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
            <p className="text-sm mt-2 whitespace-pre-wrap">{note.besprochen}</p>
          )}
          {note.naechster_schritt && (
            <div className="mt-2 p-2 bg-white rounded-lg">
              <p className="text-xs text-muted-foreground">Nächster Schritt:</p>
              <p className="text-sm font-medium">{note.naechster_schritt}</p>
            </div>
          )}
        </div>
      ))}
      {notizen.length === 0 && (
        <p className="text-muted-foreground text-sm text-center py-4">
          Keine Telefonate für dieses Projekt.
        </p>
      )}
    </div>
  );
}