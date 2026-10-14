import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { PhoneIncoming, PhoneOutgoing, CheckCircle2, ArrowRight } from 'lucide-react';
import { formatDate } from '@/lib/format';

export default function TelefonNotizKarten({ notizen, projekte, onErledigt }) {
  const projName = (pid) => projekte.find((p) => p.id === pid)?.projekt_name || '';

  if (notizen.length === 0) {
    return <p className="text-center py-3 text-muted-foreground text-sm">Keine offenen Rückrufe ✓</p>;
  }

  return (
    <div className="space-y-2">
      {notizen.map((n) => (
        <Card key={n.id} className="p-3.5 shadow-sm">
          <div className="flex items-start gap-3">
            <div className={`shrink-0 w-9 h-9 rounded-full flex items-center justify-center ${n.typ === 'Ausgehend' ? 'bg-brand-light text-brand-dark' : 'bg-accent-light text-accent'}`}>
              {n.typ === 'Ausgehend' ? <PhoneOutgoing className="w-4 h-4" /> : <PhoneIncoming className="w-4 h-4" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <p className="font-semibold truncate">{n.kontakt_name}</p>
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(n.datum?.split('T')[0])}</span>
              </div>
              {n.besprochen && <p className="text-sm text-muted-foreground line-clamp-2 mt-0.5">{n.besprochen}</p>}
              {n.naechster_schritt && (
                <div className="mt-1.5 flex items-start gap-1.5">
                  <ArrowRight className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                  <p className="text-sm font-medium">{n.naechster_schritt}</p>
                </div>
              )}
              {n.projekt_id && (
                <Link to={`/projekte/${n.projekt_id}`} className="text-xs text-brand hover:underline mt-1 inline-block truncate">
                  {projName(n.projekt_id)}
                </Link>
              )}
            </div>
          </div>
          <div className="flex justify-end mt-2">
            <Button variant="outline" size="sm" onClick={() => onErledigt(n)} className="min-h-[36px] text-status-abgeschlossen border-status-abgeschlossen/30 hover:bg-status-abgeschlossen/10">
              <CheckCircle2 className="w-3.5 h-3.5 mr-1" /> Erledigt
            </Button>
          </div>
        </Card>
      ))}
    </div>
  );
}