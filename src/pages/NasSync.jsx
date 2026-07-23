import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardDrive, Loader2, RefreshCw, CheckCircle2, Building2, FolderKanban } from 'lucide-react';
import { toast } from 'sonner';

export default function NasSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [lastSync, setLastSync] = useState(null);

  useEffect(() => {
    const stored = localStorage.getItem('nas_last_sync');
    if (stored) setLastSync(stored);
  }, []);

  const startSync = async () => {
    setSyncing(true);
    setResult(null);
    try {
      const res = await base44.functions.invoke('nasImport', { action: 'scan' });
      const data = res?.data || res;
      if (data?.error) {
        toast.error(`Fehler: ${data.error}`);
      } else {
        setResult(data);
        const now = new Date().toLocaleString('de-DE');
        localStorage.setItem('nas_last_sync', now);
        setLastSync(now);
        toast.success('Synchronisation abgeschlossen');
      }
    } catch (e) {
      toast.error(`Synchronisation fehlgeschlagen: ${e.message || ''}`);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto space-y-5">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">NAS Sync</h1>
        <p className="text-sm text-muted-foreground">Projekte aus NAS-Ordnerstruktur importieren</p>
      </div>

      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-brand-light flex items-center justify-center shrink-0">
            <HardDrive className="w-6 h-6 text-brand" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Projekte mit NAS synchronisieren</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Scannt alle Kundenordner auf der NAS und legt neue Firmen/Projekte automatisch an. Bestehende Projekte werden übersprungen.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={startSync} disabled={syncing} className="bg-brand hover:bg-brand-dark text-white gap-2 min-h-[48px]">
            {syncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            {syncing ? 'Synchronisiere...' : 'Synchronisation starten'}
          </Button>
          {lastSync && (
            <p className="text-sm text-muted-foreground">Letzte Synchronisation: {lastSync}</p>
          )}
        </div>

        <p className="text-xs text-muted-foreground">⚠️ Dieser Vorgang kann 30-60 Sekunden dauern.</p>
      </Card>

      {result && (
        <Card className="p-6 space-y-4">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            <h3 className="font-semibold">Ergebnis</h3>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="p-3 rounded-lg bg-brand-light">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-brand" /><p className="text-xs text-muted-foreground">Firmen erstellt</p></div>
              <p className="text-2xl font-bold text-brand-dark">{result.firmsCreated ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2"><Building2 className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Firmen übersprungen</p></div>
              <p className="text-2xl font-bold">{result.firmsSkipped ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-brand-light">
              <div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-brand" /><p className="text-xs text-muted-foreground">Projekte erstellt</p></div>
              <p className="text-2xl font-bold text-brand-dark">{result.projectsCreated ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-muted">
              <div className="flex items-center gap-2"><FolderKanban className="w-4 h-4 text-muted-foreground" /><p className="text-xs text-muted-foreground">Projekte übersprungen</p></div>
              <p className="text-2xl font-bold">{result.projectsSkipped ?? 0}</p>
            </div>
            <div className="p-3 rounded-lg bg-accent/10">
              <div className="flex items-center gap-2"><HardDrive className="w-4 h-4 text-accent" /><p className="text-xs text-muted-foreground">Kunden gesamt</p></div>
              <p className="text-2xl font-bold text-accent">{result.totalCustomers ?? 0}</p>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}