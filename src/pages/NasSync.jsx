import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HardDrive, Loader2, RefreshCw, CheckCircle2, Building2, FolderKanban, Users, Upload, Download, Wifi } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function NasSync() {
  const [syncing, setSyncing] = useState(false);
  const [result, setResult] = useState(null);
  const [lastSync, setLastSync] = useState(null);
  const [contactSyncing, setContactSyncing] = useState(false);
  const [contactResult, setContactResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [discoverResult, setDiscoverResult] = useState(null);

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

  const pushAllContacts = async () => {
    setContactSyncing(true); setContactResult(null);
    try {
      const res = await base44.functions.invoke('nasContacts', { action: 'push_all' });
      const data = res?.data || res;
      if (data?.error) { toast.error(`Fehler: ${data.error}`); }
      else { setContactResult(data); toast.success(`${data.pushedFirmen + data.pushedPersons} Kontakte auf NAS gespeichert`); }
    } catch (e) { toast.error(`Sync fehlgeschlagen: ${e.message || ''}`); }
    finally { setContactSyncing(false); }
  };

  const importContacts = async () => {
    setContactSyncing(true); setContactResult(null);
    try {
      const res = await base44.functions.invoke('nasContacts', { action: 'sync' });
      const data = res?.data || res;
      if (data?.error) { toast.error(`Fehler: ${data.error}`); }
      else { setContactResult(data); toast.success(`${(data.updatedFirmen ?? 0) + (data.updatedPersons ?? 0) + (data.newFromNas ?? 0)} Kontakte verarbeitet`); }
    } catch (e) { toast.error(`Import fehlgeschlagen: ${e.message || ''}`); }
    finally { setContactSyncing(false); }
  };

  const testCarddav = async () => {
    setTesting(true); setDiscoverResult(null);
    try {
      const res = await base44.functions.invoke('nasContacts', { action: 'discover' });
      const data = res?.data || res;
      setDiscoverResult(data);
      if (!data?.success) toast.error('Synology Contacts nicht gefunden');
    } catch (e) { setDiscoverResult({ success: false, error: e.message }); toast.error('Verbindungstest fehlgeschlagen'); }
    finally { setTesting(false); }
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

      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-accent/10 flex items-center justify-center shrink-0">
            <Users className="w-6 h-6 text-accent" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">Kontakte mit NAS synchronisieren</h2>
            <p className="text-sm text-muted-foreground mt-1">
              Überträgt alle Firmen und Ansprechpartner als vCards auf die NAS (CardDAV) bzw. importiert Kontakte von der NAS.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <Button onClick={pushAllContacts} disabled={contactSyncing} className="bg-brand hover:bg-brand-dark text-white gap-2 min-h-[48px]">
            {contactSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {contactSyncing ? 'Übertrage...' : 'Alle Kontakte → NAS'}
          </Button>
          <Button onClick={importContacts} disabled={contactSyncing} variant="outline" className="gap-2 min-h-[48px]">
            {contactSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Von NAS importieren
          </Button>
        </div>
        {contactResult && (
          <div className="grid grid-cols-3 gap-3">
            {contactResult.pushedFirmen !== undefined && (
              <>
                <div className="p-3 rounded-lg bg-brand-light"><p className="text-xs text-muted-foreground">Firmen gepusht</p><p className="text-2xl font-bold text-brand-dark">{contactResult.pushedFirmen}</p></div>
                <div className="p-3 rounded-lg bg-accent/10"><p className="text-xs text-muted-foreground">Personen gepusht</p><p className="text-2xl font-bold text-accent">{contactResult.pushedPersons}</p></div>
                <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Fehler</p><p className="text-2xl font-bold text-destructive">{contactResult.errors}</p></div>
              </>
            )}
            {contactResult.updatedFirmen !== undefined && (
              <>
                <div className="p-3 rounded-lg bg-brand-light"><p className="text-xs text-muted-foreground">Aktualisiert</p><p className="text-2xl font-bold text-brand-dark">{(contactResult.updatedFirmen ?? 0) + (contactResult.updatedPersons ?? 0)}</p></div>
                <div className="p-3 rounded-lg bg-accent/10"><p className="text-xs text-muted-foreground">Neu erstellt</p><p className="text-2xl font-bold text-accent">{contactResult.newFromNas ?? 0}</p></div>
                <div className="p-3 rounded-lg bg-muted"><p className="text-xs text-muted-foreground">Gesamt auf NAS</p><p className="text-2xl font-bold">{contactResult.total ?? 0}</p></div>
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="p-6 space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center shrink-0">
            <Wifi className="w-6 h-6 text-muted-foreground" />
          </div>
          <div>
            <h2 className="font-semibold text-lg">CardDAV Verbindung testen</h2>
            <p className="text-sm text-muted-foreground mt-1">Prüft, ob Synology Contacts auf der NAS erreichbar ist.</p>
          </div>
        </div>
        <Button onClick={testCarddav} disabled={testing} variant="outline" className="gap-2 min-h-[48px]">
          {testing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wifi className="w-4 h-4" />}
          {testing ? 'Teste...' : 'Verbindung testen'}
        </Button>
        {discoverResult && (
          <div className={cn("p-3 rounded-lg text-sm", discoverResult.success ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700")}>
            {discoverResult.success ? `✓ CardDAV gefunden: ${discoverResult.addressBookUrl}` : `✗ ${discoverResult.error || 'Nicht gefunden'}`}
          </div>
        )}
      </Card>
    </div>
  );
}