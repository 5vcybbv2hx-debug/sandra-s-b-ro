import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { formatDate } from '@/lib/format';
import { Pencil, Trash2 } from 'lucide-react';
import { STATUS, PRIO_STYLES } from './wunschConstants';

export default function WunschRow({ wunsch, onStatusChange, onEdit, onDelete }) {
  return (
    <Card className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-sm leading-snug">{wunsch.titel}</p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 mt-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground/80">{wunsch.bereich}</span>
            <span>·</span>
            <span className={cn('px-1.5 py-0.5 rounded-full text-[11px] font-medium', PRIO_STYLES[wunsch.prioritaet] || 'bg-gray-100 text-gray-600')}>{wunsch.prioritaet}</span>
            {wunsch.eingereicht_von && <><span>·</span><span>{wunsch.eingereicht_von}</span></>}
            {wunsch.quelle && <><span>·</span><span>{wunsch.quelle}</span></>}
            {(wunsch.datum || wunsch.created_date) && <><span>·</span><span>{formatDate(wunsch.datum || wunsch.created_date)}</span></>}
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <Button variant="ghost" size="icon" onClick={() => onEdit(wunsch)} aria-label="Bearbeiten"><Pencil className="w-4 h-4" /></Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="icon" aria-label="Löschen"><Trash2 className="w-4 h-4 text-rose-600" /></Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Wunsch löschen?</AlertDialogTitle>
                <AlertDialogDescription>"{wunsch.titel}" wird endgültig entfernt.</AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Abbrechen</AlertDialogCancel>
                <AlertDialogAction onClick={() => onDelete(wunsch)} className="bg-rose-600 hover:bg-rose-700 text-white">Löschen</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
      {wunsch.beschreibung && <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap">{wunsch.beschreibung}</p>}
      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between gap-3">
        <span className="text-xs text-muted-foreground">Status</span>
        <Select value={wunsch.status} onValueChange={(v) => onStatusChange(wunsch, v)}>
          <SelectTrigger className="h-9 w-36"><SelectValue /></SelectTrigger>
          <SelectContent>{STATUS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
        </Select>
      </div>
    </Card>
  );
}