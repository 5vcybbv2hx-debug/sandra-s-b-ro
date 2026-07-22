import { useState, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// shadcn/ui components
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

// Icons
import {
  FileText,
  Image,
  File,
  Loader2,
  UploadCloud,
  AlertTriangle,
  FolderOpen,
  Folder,
  RefreshCw,
  Plus
} from 'lucide-react';

// Helper to format file sizes to MB or KB
const formatFileSize = (bytes) => {
  if (bytes === undefined || bytes === null || isNaN(bytes)) return '0 KB';
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) {
    return `${mb.toFixed(1)} MB`;
  }
  const kb = bytes / 1024;
  return `${Math.round(kb)} KB`;
};

// Helper to format modification date to German format (DD.MM.YYYY)
const formatFileDate = (dateVal) => {
  if (!dateVal) return '—';
  try {
    return formatDate(dateVal);
  } catch (e) {
    return '—';
  }
};

export default function ProjektDokumente({ projekt, firma }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState('');
  const [nasNotReachable, setNasNotReachable] = useState(false);
  const [sharingFile, setSharingFile] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  
  const fileInputRef = useRef(null);

  // Auto-load on mount or when projekt/firma changes
  useEffect(() => {
    loadFiles();
  }, [projekt?.id, firma?.id]);

  const loadFiles = async () => {
    if (!projekt?.projekt_name) return;
    
    // Graceful handling of null firma
    if (!firma?.name) {
      setLoading(false);
      setFiles([]);
      return;
    }

    setLoading(true);
    setNasNotReachable(false);

    try {
      const response = await base44.fn.nasBridge({
        action: 'list',
        firma: firma.name,
        projekt: projekt.projekt_name
      });

      if (response && response.error) {
        // If response explicitly indicates connection failure
        const errMsg = String(response.error).toLowerCase();
        if (errMsg.includes('reachable') || errMsg.includes('connect') || errMsg.includes('host') || errMsg.includes('timeout')) {
          setNasNotReachable(true);
        } else {
          toast.error(`Fehler beim Laden: ${response.error}`);
        }
      } else {
        setFiles(response || []);
      }
    } catch (error) {
      console.error('Fehler beim Abrufen der NAS-Dokumente:', error);
      // Treat general API failure for this integration as "NAS not reachable"
      setNasNotReachable(true);
    } finally {
      setLoading(false);
    }
  };

  // Convert File object to Base64
  const convertToBase64 = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        // Split and grab only the base64 part, discarding the data:mimeType;base64, prefix
        const base64 = reader.result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = (error) => reject(error);
    });
  };

  // File Upload handler (supports multiple files)
  const handleUploadFiles = async (selectedFiles) => {
    if (!selectedFiles || selectedFiles.length === 0) return;
    
    if (!firma?.name) {
      toast.error('Keine Firma zugeordnet. Bitte ordnen Sie dem Projekt eine Firma zu.');
      return;
    }

    setUploading(true);
    const filesArray = Array.from(selectedFiles);

    try {
      for (let i = 0; i < filesArray.length; i++) {
        const file = filesArray[i];
        setUploadProgress(`Lade Datei ${i + 1} von ${filesArray.length} hoch: "${file.name}"...`);

        const fileBase64 = await convertToBase64(file);

        await base44.fn.nasBridge({
          action: 'upload',
          firma: firma.name,
          projekt: projekt.projekt_name,
          fileName: file.name,
          fileBase64
        });
      }

      toast.success(`${filesArray.length} ${filesArray.length === 1 ? 'Datei' : 'Dateien'} erfolgreich hochgeladen`);
      loadFiles(); // Refresh file list
    } catch (error) {
      console.error('Upload-Fehler:', error);
      toast.error(`Fehler beim Hochladen: ${error.message || 'Serverfehler'}`);
    } finally {
      setUploading(false);
      setUploadProgress('');
    }
  };

  // File open (share and open in new tab)
  const handleOpenFile = async (file) => {
    if (!firma?.name || !projekt?.projekt_name) return;

    setSharingFile(file.name);
    try {
      const response = await base44.fn.nasBridge({
        action: 'share',
        firma: firma.name,
        projekt: projekt.projekt_name,
        fileName: file.name
      });

      const url = response?.url || response?.link || response?.shareUrl || response;

      if (url && typeof url === 'string') {
        window.open(url, '_blank');
      } else {
        throw new Error('Kein gültiger Freigabelink erhalten');
      }
    } catch (error) {
      console.error('Fehler beim Öffnen der Datei:', error);
      toast.error(`Öffnen fehlgeschlagen: ${error.message || 'Freigabelink konnte nicht erstellt werden'}`);
    } finally {
      setSharingFile(null);
    }
  };

  // Drag and Drop handlers
  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleUploadFiles(e.dataTransfer.files);
    }
  };

  // Select icon based on file extension
  const getFileIcon = (fileName) => {
    const ext = fileName?.split('.').pop()?.toLowerCase() || '';
    if (['pdf', 'dwg', 'dxf'].includes(ext)) {
      return FileText;
    }
    if (['png', 'jpg', 'jpeg', 'gif', 'svg', 'webp', 'bmp'].includes(ext)) {
      return Image;
    }
    return File;
  };

  // Handle case where projekt is not ready yet
  if (!projekt) {
    return <div className="text-center p-8 text-muted-foreground">Kein Projekt geladen.</div>;
  }

  // Graceful state: if firma is null, prompt the user to assign a company
  if (!firma) {
    return (
      <Card className="p-6 border border-border bg-card">
        <div className="flex flex-col items-center justify-center text-center py-6">
          <AlertTriangle className="w-12 h-12 text-amber-500 mb-3" />
          <h3 className="text-lg font-semibold mb-1">Keine Firma zugeordnet</h3>
          <p className="text-sm text-muted-foreground max-w-md mb-4">
            Dieses Projekt ist aktuell keiner Firma zugeordnet. Bitte weisen Sie dem Projekt in den Stammdaten eine Firma zu, um die NAS-Dokumentenverwaltung zu nutzen.
          </p>
        </div>
      </Card>
    );
  }

  // Generate NAS Path
  const nasPath = `/Kunde/${firma.name}/${projekt.projekt_name}/`;

  return (
    <div className="space-y-4">
      {/* NAS Path Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-3 bg-cardbg border border-border/80 rounded-2xl">
        <div className="flex items-center gap-2 text-sm text-muted-foreground font-medium min-w-0 flex-1">
          <Folder className="w-4 h-4 text-brand shrink-0 animate-pulse" />
          <span className="font-semibold text-foreground shrink-0">NAS Pfad:</span>
          <span className="font-mono text-xs truncate bg-background px-2 py-1 rounded border border-border/40 select-all" title={nasPath}>
            {nasPath}
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={loadFiles}
          disabled={loading || uploading}
          className="h-8 text-muted-foreground hover:text-foreground shrink-0 gap-1.5 self-end sm:self-auto"
        >
          <RefreshCw className={cn("w-3.5 h-3.5", loading && "animate-spin")} />
          Aktualisieren
        </Button>
      </div>

      {/* Uploading Progress Overlay/State */}
      {uploading && (
        <Card className="p-4 border-brand/20 bg-brand/5 animate-pulse">
          <div className="flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-brand animate-spin" />
            <div className="text-sm">
              <span className="font-semibold text-brand">Dokumente werden hochgeladen...</span>
              <p className="text-muted-foreground text-xs mt-0.5">{uploadProgress}</p>
            </div>
          </div>
        </Card>
      )}

      {/* Main Content Area */}
      {loading ? (
        <Card className="p-12 border border-border bg-card">
          <div className="flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-brand animate-spin" />
            <p className="text-sm text-muted-foreground font-medium">Lade NAS-Dokumente...</p>
          </div>
        </Card>
      ) : nasNotReachable ? (
        /* NAS Unreachable State */
        <Card className="p-6 border-rose-200/50 bg-rose-50/50 dark:bg-rose-950/10">
          <div className="flex flex-col items-center justify-center text-center py-4">
            <AlertTriangle className="w-12 h-12 text-rose-500 mb-3" />
            <h3 className="text-lg font-semibold text-foreground mb-1">NAS nicht erreichbar</h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              Die Verbindung zum lokalen NAS-Server konnte nicht hergestellt werden. Bitte stellen Sie sicher, dass das NAS eingeschaltet ist und die Portweiterleitung korrekt konfiguriert wurde.
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <Button 
                onClick={loadFiles} 
                className="bg-rose-600 hover:bg-rose-700 text-white min-h-[44px]"
              >
                Erneut versuchen
              </Button>
              <Button 
                variant="outline" 
                onClick={() => fileInputRef.current?.click()}
                className="border-rose-200/50 hover:bg-rose-50 min-h-[44px]"
              >
                Trotzdem Datei hochladen
              </Button>
            </div>
          </div>
        </Card>
      ) : (
        /* Drag-and-Drop + File List Wrapper */
        <div
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "transition-all duration-200 rounded-2xl border-2 border-dashed",
            isDragging 
              ? "border-brand bg-brand/5 scale-[1.01]" 
              : "border-transparent"
          )}
        >
          {files.length === 0 ? (
            /* Folder Empty State */
            <Card className="p-12 border border-border bg-card flex flex-col items-center justify-center text-center">
              <FolderOpen className="w-14 h-14 text-muted-foreground/50 mb-4" />
              <h3 className="text-lg font-semibold mb-1">Noch keine Dokumente</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-6">
                Laden Sie die ersten Pläne, Bilder oder PDF-Dateien für dieses Projekt direkt auf das NAS hoch.
              </p>
              
              <Button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="bg-brand hover:bg-brand/90 text-white gap-2 min-h-[48px] px-6 font-semibold shadow-sm"
              >
                <Plus className="w-4 h-4" />
                Dokumente hochladen
              </Button>
            </Card>
          ) : (
            /* File Listing */
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted-foreground tracking-wider uppercase">
                  Dateien ({files.length})
                </span>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="text-brand border-brand/20 hover:bg-brand/5 h-9 font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Hinzufügen
                </Button>
              </div>

              <div className="space-y-2">
                {files.map((file, idx) => {
                  const FileIcon = getFileIcon(file.name);
                  return (
                    <div
                      key={idx}
                      className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-card border border-border rounded-xl hover:shadow-sm transition-shadow min-h-[64px]"
                    >
                      {/* Left: Icon & Name */}
                      <div className="flex items-center gap-3 min-w-0 flex-1">
                        <div className="w-10 h-10 rounded-lg bg-cardbg border border-border/40 flex items-center justify-center shrink-0">
                          <FileIcon className="w-5 h-5 text-brand" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p 
                            className="font-semibold text-foreground text-sm truncate" 
                            title={file.name}
                          >
                            {file.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-muted-foreground sm:hidden">
                            <span>{formatFileSize(file.size)}</span>
                            <span>•</span>
                            <span>{formatFileDate(file.mtime || file.date || file.modified)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Metadata & Open Button */}
                      <div className="flex items-center justify-between sm:justify-end gap-5 shrink-0 w-full sm:w-auto pt-2 sm:pt-0 border-t border-border/40 sm:border-0">
                        <div className="hidden sm:flex flex-col items-end text-xs text-muted-foreground pr-1">
                          <span className="font-medium text-foreground">{formatFileSize(file.size)}</span>
                          <span className="mt-0.5">{formatFileDate(file.mtime || file.date || file.modified)}</span>
                        </div>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenFile(file)}
                          disabled={sharingFile === file.name}
                          className="text-accent border-accent/20 hover:bg-accent/5 h-9 min-h-[36px] w-full sm:w-24 font-semibold shrink-0 gap-1.5"
                        >
                          {sharingFile === file.name ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                          ) : (
                            'Öffnen'
                          )}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Dotted Drag & Drop Hint */}
              <div 
                onClick={() => fileInputRef.current?.click()}
                className="p-6 border-2 border-dashed border-border/60 hover:border-brand/40 bg-cardbg/40 hover:bg-cardbg/80 rounded-xl flex flex-col items-center justify-center text-center cursor-pointer transition-colors mt-4"
              >
                <UploadCloud className="w-7 h-7 text-muted-foreground/60 mb-2" />
                <span className="text-xs font-semibold text-foreground">Dateien hierhin ziehen oder klicken</span>
                <span className="text-[10px] text-muted-foreground mt-0.5">Unterstützt Mehrfachauswahl & Drag-and-Drop</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Hidden File Input for uploading */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => handleUploadFiles(e.target.files)}
        multiple
        className="hidden"
      />
    </div>
  );
}