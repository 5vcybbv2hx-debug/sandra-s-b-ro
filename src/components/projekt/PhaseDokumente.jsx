import { useState, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { FileText, Image as ImageIcon, File as FileIcon, Loader2, AlertTriangle, Share2, ChevronDown, ChevronRight, UploadCloud } from 'lucide-react';
import { toast } from 'sonner';

const PHASE_SUBFOLDERS = {
  Entwurf: ['1_Unterlagen', '2_Vorabzug'],
  Baugesuch: ['3_Baugesuch'],
  Werkplanung: ['4_Werkplanung'],
};

const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '—';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} MB`;
  return `${Math.round(bytes / 1024)} KB`;
};

const getFileIcon = (fileName) => {
  const ext = fileName?.split('.').pop()?.toLowerCase() || '';
  if (['pdf', 'dwg', 'dxf', 'doc', 'docx'].includes(ext)) return FileText;
  if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) return ImageIcon;
  return FileIcon;
};

const parseNasPath = (notizen) => {
  if (!notizen) return null;
  const match = notizen.match(/\[NAS-Pfad:\s*([^\]]+)\]/);
  if (!match) return null;
  const path = match[1].trim().replace(/\/+$/, '');
  const parts = path.split('/').filter(Boolean);
  const kundenIdx = parts.findIndex((p) => p === '0_Kunden');
  if (kundenIdx === -1 || parts.length < kundenIdx + 3) return null;
  return { firma: parts[kundenIdx + 1], projekt: parts.slice(kundenIdx + 2).join('/') };
};

const convertToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
  });

export default function PhaseDokumente({ phase, projekt, firma }) {
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [filesBySubfolder, setFilesBySubfolder] = useState({});
  const [loaded, setLoaded] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sharingFile, setSharingFile] = useState(null);
  const fileInputRef = useRef(null);

  const nasInfo = parseNasPath(projekt?.notizen);
  const firmaName = nasInfo?.firma || firma?.name || null;
  const projektPath = nasInfo?.projekt || projekt?.projekt_name || null;
  const subfolders = PHASE_SUBFOLDERS[phase] || [];
  const hasNas = !!firmaName && !!projektPath;
  const totalCount = Object.values(filesBySubfolder).flat().length;

  const loadFiles = async () => {
    if (!hasNas) return;
    setLoading(true);
    setError(false);
    let hadError = false;
    try {
      const results = {};
      for (const sub of subfolders) {
        const response = await base44.functions.invoke('nasBridge', { action: 'list', firma: firmaName, projekt: `${projektPath}/${sub}` });
        const data = response?.data || response;
        if (data?.error) {
          const msg = String(data.error).toLowerCase();
          if (msg.includes('reachable') || msg.includes('timeout') || msg.includes('connect')) {
            hadError = true;
            break;
          }
          results[sub] = [];
        } else {
          results[sub] = (data?.files || []).filter((f) => !f.isdir);
        }
      }
      if (hadError) {
        setError(true);
        setFilesBySubfolder({});
      } else {
        setFilesBySubfolder(results);
      }
      setLoaded(true);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !expanded;
    setExpanded(next);
    if (next && !loaded && !loading) loadFiles();
  };

  const handleUpload = async (selectedFiles) => {
    if (!selectedFiles?.length || !hasNas) return;
    setUploading(true);
    const arr = Array.from(selectedFiles);
    const targetSub = subfolders[0];
    try {
      for (const file of arr) {
        const fileBase64 = await convertToBase64(file);
        await base44.functions.invoke('nasBridge', { action: 'upload', firma: firmaName, projekt: `${projektPath}/${targetSub}`, fileName: file.name, fileBase64 });
      }
      toast.success(`${arr.length} Datei(en) hochgeladen`);
      setLoaded(false);
      loadFiles();
    } catch (e) {
      toast.error(`Upload fehlgeschlagen: ${e.message || 'Serverfehler'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleShare = async (file, subfolder) => {
    setSharingFile(file.name);
    try {
      const response = await base44.functions.invoke('nasBridge', { action: 'share', firma: firmaName, projekt: `${projektPath}/${subfolder}`, fileName: file.name });
      const data = response?.data || response;
      const url = data?.url;
      if (url) {
        await navigator.clipboard.writeText(url);
        toast.success('Freigabelink in Zwischenablage kopiert');
        window.open(url, '_blank');
      } else throw new Error('Kein Freigabelink erhalten');
    } catch (e) {
      toast.error(`Teilen fehlgeschlagen: ${e.message || ''}`);
    } finally {
      setSharingFile(null);
    }
  };

  return (
    <div className="mt-3 border-t border-border/60 pt-3">
      <div className="flex items-center justify-between gap-2">
        <button onClick={handleToggle} className="flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-brand transition-colors min-h-[36px]">
          {expanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          📁 Dokumente {loaded && `(${totalCount})`}
        </button>
        {hasNas && expanded && !loading && !error && (
          <Button size="sm" variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="text-brand border-brand/20 hover:bg-brand/5 h-8 gap-1.5">
            <UploadCloud className="w-3.5 h-3.5" /> Upload
          </Button>
        )}
      </div>

      {expanded && (
        <div className="mt-2">
          {!hasNas ? (
            <p className="text-xs text-muted-foreground py-2">Kein NAS-Ordner verknüpft.</p>
          ) : loading ? (
            <div className="flex items-center gap-2 py-3">
              <Loader2 className="w-4 h-4 text-brand animate-spin" />
              <span className="text-sm text-muted-foreground">Lade Dokumente...</span>
            </div>
          ) : error ? (
            <div className="flex items-center gap-2 py-2">
              <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
              <span className="text-sm text-muted-foreground">NAS nicht erreichbar</span>
              <Button size="sm" variant="ghost" onClick={loadFiles} className="h-7 text-xs text-rose-600 hover:text-rose-700">Erneut</Button>
            </div>
          ) : totalCount === 0 ? (
            <p className="text-xs text-muted-foreground py-2">Keine Dokumente in diesem Ordner</p>
          ) : (
            <div className="space-y-3">
              {subfolders.filter((s) => (filesBySubfolder[s] || []).length > 0).map((sub) => (
                <div key={sub}>
                  {subfolders.length > 1 && <p className="text-xs font-semibold text-muted-foreground mb-1.5">{sub}</p>}
                  <div className="space-y-1.5">
                    {(filesBySubfolder[sub] || []).map((file, idx) => {
                      const FileIcon = getFileIcon(file.name);
                      return (
                        <div key={idx} className="flex items-center justify-between gap-2 p-2 bg-cardbg rounded-lg min-h-[44px]">
                          <div className="flex items-center gap-2 min-w-0 flex-1">
                            <FileIcon className="w-4 h-4 text-brand shrink-0" />
                            <span className="text-sm truncate" title={file.name}>{file.name}</span>
                            <span className="text-xs text-muted-foreground shrink-0">{formatFileSize(file.size)}</span>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => handleShare(file, sub)} disabled={sharingFile === file.name} className="h-7 text-xs text-accent hover:bg-accent/5 shrink-0 gap-1">
                            {sharingFile === file.name ? <Loader2 className="w-3 h-3 animate-spin" /> : <Share2 className="w-3 h-3" />}
                            Teilen
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <input type="file" ref={fileInputRef} onChange={(e) => handleUpload(e.target.files)} multiple className="hidden" />
    </div>
  );
}