import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  FileText, Image, File, Loader2, UploadCloud, AlertTriangle,
  FolderOpen, Folder, RefreshCw, Plus, Share2, ChevronRight, HardDrive
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

const getFileIcon = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'dwg', 'dxf', 'doc', 'docx'].includes(ext)) return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return Image;
  return File;
};

// Parse NAS path from notizen: [NAS-Pfad: /Bautechnik Hugendubel/0_Kunden/{Firma}/{Projekt}]
const parseNasPath = (notizen) => {
  if (!notizen) return null;
  const match = notizen.match(/\[NAS-Pfad:\s*([^\]]+)\]/);
  if (!match) return null;
  const path = match[1].trim().replace(/\/+$/, '');
  // Expected: /Bautechnik Hugendubel/0_Kunden/{Firma}/{Projekt}
  const parts = path.split('/').filter(Boolean);
  const kundenIdx = parts.findIndex((p) => p === '0_Kunden');
  if (kundenIdx === -1 || parts.length < kundenIdx + 3) return null;
  return {
    firma: parts[kundenIdx + 1],
    projekt: parts.slice(kundenIdx + 2).join('/'),
    full: path,
  };
};

export default function ProjektDokumente({ projekt, firma }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [nasError, setNasError] = useState(false);
  const [sharingFile, setSharingFile] = useState(null);
  const [activeSubfolder, setActiveSubfolder] = useState(null);
  const [breadcrumb, setBreadcrumb] = useState([]);
  const fileInputRef = useRef(null);

  const nasInfo = parseNasPath(projekt?.notizen);
  // Fallback: use firma.name + projekt.projekt_name if no NAS path in notizen
  const firmaName = nasInfo?.firma || firma?.name || null;
  const projektPath = nasInfo?.projekt || projekt?.projekt_name || null;

  useEffect(() => { loadFiles(); }, [projekt?.id, firma?.id, activeSubfolder]);

  const loadFiles = async () => {
    if (!firmaName || !projektPath) { setLoading(false); return; }
    setLoading(true);
    setNasError(false);
    try {
      const projektParam = activeSubfolder ? `${projektPath}/${activeSubfolder}` : projektPath;
      const response = await base44.functions.invoke('nasBridge', { action: 'list', firma: firmaName, projekt: projektParam });
      const data = response?.data || response;
      if (data?.error) {
        const msg = String(data.error).toLowerCase();
        if (msg.includes('reachable') || msg.includes('timeout') || msg.includes('connect')) setNasError(true);
        else toast.error(`Fehler beim Laden: ${data.error}`);
        setFiles([]);
      } else {
        setFiles(data?.files || []);
      }
    } catch (e) {
      setNasError(true);
      setFiles([]);
    } finally { setLoading(false); }
  };

  const convertToBase64 = (file) => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

  const handleUpload = async (selectedFiles) => {
    if (!selectedFiles?.length) return;
    if (!firmaName || !projektPath) { toast.error('Kein NAS-Ordner verknüpft.'); return; }
    setUploading(true);
    const arr = Array.from(selectedFiles);
    try {
      for (const file of arr) {
        const fileBase64 = await convertToBase64(file);
        const projektParam = activeSubfolder ? `${projektPath}/${activeSubfolder}` : projektPath;
        await base44.functions.invoke('nasBridge', { action: 'upload', firma: firmaName, projekt: projektParam, fileName: file.name, fileBase64 });
      }
      toast.success(`${arr.length} Datei(en) hochgeladen`);
      loadFiles();
    } catch (e) { toast.error(`Upload fehlgeschlagen: ${e.message || 'Serverfehler'}`); }
    finally { setUploading(false); }
  };

  const handleShare = async (file) => {
    setSharingFile(file.name);
    try {
      const projektParam = activeSubfolder ? `${projektPath}/${activeSubfolder}` : projektPath;
      const response = await base44.functions.invoke('nasBridge', { action: 'share', firma: firmaName, projekt: projektParam, fileName: file.name });
      const data = response?.data || response;
      const url = data?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success('Freigabelink in Zwischenablage kopiert');
        window.open(url, '_blank');
      } else { throw new Error('Kein Freigabelink erhalten'); }
    } catch (e) { toast.error(`Teilen fehlgeschlagen: ${e.message || ''}`); }
    finally { setSharingFile(null); }
  };

  const openSubfolder = (folderName) => {
    setBreadcrumb([...breadcrumb, folderName]);
    setActiveSubfolder(activeSubfolder ? `${activeSubfolder}/${folderName}` : folderName);
  };

  const goToRoot = () => { setActiveSubfolder(null); setBreadcrumb([]); };

  if (!projekt) return <div className="text-center p-8 text-muted-foreground">Kein Projekt geladen.</div>;

  if (!firmaName || !projektPath) {
    return (
      <Card className="p-6 border border-border bg-card">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <HardDrive className="w-12 h-12 text-muted-foreground/40 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Kein NAS-Ordner verknüpft</h3>
          <p className="text-sm text-muted-foreground max-w-md">
            Dieses Projekt hat keinen NAS-Pfad in den Notizen hinterlegt. Bitte stellen Sie sicher, dass das Projekt mit dem NAS synchronisiert wurde.
          </p>
        </div>
      </Card>
    );
  }

  const subfolders = files.filter((f) => f.isdir);
  const fileItems = files.filter((f) => !f.isdir);
  const nasDisplayPath = `/Bautechnik Hugendubel/0_Kunden/${firmaName}/${projektPath}${activeSubfolder ? '/' + activeSubfolder : ''}`;

  return (
    <div className="space-y-4">
      {/* Breadcrumb + Refresh */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-cardbg border border-border/80 rounded-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground min-w-0 flex-1 flex-wrap">
          <Folder className="w-4 h-4 text-brand shrink-0" />
          <button onClick={goToRoot} className="font-semibold text-foreground hover:text-brand shrink-0">NAS</button>
          {breadcrumb.map((b, i) => (
            <span key={i} className="flex items-center gap-2 shrink-0">
              <ChevronRight className="w-3 h-3" />
              <span className="text-foreground truncate">{b}</span>
            </span>
          ))}
          <span className="font-mono text-xs truncate bg-background px-2 py-1 rounded border border-border/40 select-all hidden lg:inline-block" title={nasDisplayPath}>{nasDisplayPath}</span>
        </div>
        <Button variant="ghost" size="sm" onClick={loadFiles} disabled={loading || uploading} className="h-8 text-muted-foreground hover:text-foreground shrink-0 gap-1.5">
          <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} /> Aktualisieren
        </Button>
      </div>

      {uploading && (
        <Card className="p-4 border-brand/20 bg-brand/5">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand animate-spin" />
            <span className="text-sm font-semibold text-brand">Dateien werden hochgeladen...</span>
          </div>
        </Card>
      )}

      {loading ? (
        <Card className="p-12 border border-border">
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-sm text-muted-foreground">Lade NAS-Dateien...</p>
          </div>
        </Card>
      ) : nasError ? (
        <Card className="p-6 border-rose-200/50 bg-rose-50/50">
          <div className="flex flex-col items-center text-center py-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-semibold mb-1">NAS nicht erreichbar</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-4">Die Verbindung zum NAS konnte nicht hergestellt werden. Bitte prüfen Sie, ob das NAS eingeschaltet ist.</p>
            <Button onClick={loadFiles} className="bg-rose-600 hover:bg-rose-700 text-white">Erneut versuchen</Button>
          </div>
        </Card>
      ) : files.length === 0 ? (
        <Card className="p-12 border border-border flex flex-col items-center text-center">
          <FolderOpen className="w-14 h-14 text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-semibold mb-1">Ordner ist leer</h3>
          <p className="text-sm text-muted-foreground max-w-sm mb-6">Laden Sie die ersten Dateien für diesen Ordner hoch.</p>
          <Button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="bg-brand hover:bg-brand/90 text-white gap-2">
            <Plus className="w-4 h-4" /> Dateien hochladen
          </Button>
        </Card>
      ) : (
        <div className="space-y-4">
          {/* Subfolders */}
          {subfolders.length > 0 && (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {subfolders.map((folder, idx) => (
                <button key={idx} onClick={() => openSubfolder(folder.name)} className="flex items-center gap-3 p-4 bg-card border border-border rounded-xl hover:border-brand hover:bg-brand/5 transition-colors text-left min-h-[64px]">
                  <div className="w-10 h-10 rounded-lg bg-brand-light flex items-center justify-center shrink-0">
                    <Folder className="w-5 h-5 text-brand" />
                  </div>
                  <span className="font-medium text-sm truncate">{folder.name}</span>
                </button>
              ))}
            </div>
          )}

          {/* Files */}
          {fileItems.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">Dateien ({fileItems.length})</span>
              <div className="flex justify-end mb-1">
                <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-brand border-brand/20 hover:bg-brand/5">
                  <Plus className="w-4 h-4 mr-1" /> Hinzufügen
                </Button>
              </div>
              {fileItems.map((file, idx) => {
                const FileIcon = getFileIcon(file.name);
                return (
                  <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow min-h-[64px]">
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div className="w-10 h-10 rounded-lg bg-cardbg border border-border/40 flex items-center justify-center shrink-0">
                        <FileIcon className="w-5 h-5 text-brand" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-sm truncate" title={file.name}>{file.name}</p>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground">
                          <span>{formatFileSize(file.size)}</span>
                          <span>•</span>
                          <span>{formatDate(file.modified)}</span>
                        </div>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => handleShare(file)} disabled={sharingFile === file.name} className="text-accent border-accent/20 hover:bg-accent/5 shrink-0 gap-1.5">
                      {sharingFile === file.name ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Share2 className="w-3.5 h-3.5" />}
                      Teilen
                    </Button>
                  </div>
                );
              })}
            </div>
          )}

          {subfolders.length === 0 && fileItems.length === 0 && (
            <Card className="p-8 border-2 border-dashed border-border/60 bg-cardbg/40 rounded-xl flex flex-col items-center text-center cursor-pointer" onClick={() => fileInputRef.current?.click()}>
              <UploadCloud className="w-7 h-7 text-muted-foreground/60 mb-2" />
              <span className="text-xs font-semibold">Dateien hierhin ziehen oder klicken</span>
            </Card>
          )}
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={(e) => handleUpload(e.target.files)} multiple className="hidden" />
    </div>
  );
}