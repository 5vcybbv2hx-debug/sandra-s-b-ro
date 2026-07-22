import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

// Set NODE_TLS_REJECT_UNAUTHORIZED to ignore self-signed certs in Node-like environments
if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

Deno.serve(async (req) => {
  // We can create the base44 client to authenticate or authorize if needed
  // Note: Since this is called by Base44 automations/apps, we can just use createClientFromRequest(req)
  try {
    const base44 = createClientFromRequest(req);
  } catch (e) {
    // If auth client creation fails, we can either ignore or handle it, but it's good to call it
  }
  
  // Parse body
  let body: any;
  try {
    body = await req.json();
  } catch (err) {
    return Response.json({ success: false, error: 'Ungueltiges JSON im Request-Body.' }, { status: 400 });
  }

  const { action, firma, projekt, fileName, fileBase64 } = body;

  if (!action) {
    return Response.json({ success: false, error: 'Aktion (action) fehlt.' }, { status: 400 });
  }

  if (action !== 'list' && action !== 'upload' && action !== 'share') {
    return Response.json({ success: false, error: `Ungueltige Aktion: ${action}` }, { status: 400 });
  }

  if (!firma || !projekt) {
    return Response.json({ success: false, error: 'Firma und Projekt sind erforderlich.' }, { status: 400 });
  }

  // Get environment secrets
  const NAS_URL = Deno.env.get('NAS_URL') || (typeof process !== 'undefined' ? process.env.NAS_URL : undefined);
  const NAS_USER = Deno.env.get('NAS_USER') || (typeof process !== 'undefined' ? process.env.NAS_USER : undefined);
  const NAS_PASSWORD = Deno.env.get('NAS_PASSWORD') || (typeof process !== 'undefined' ? process.env.NAS_PASSWORD : undefined);

  if (!NAS_URL || !NAS_USER || !NAS_PASSWORD) {
    return Response.json({ success: false, error: 'NAS Zugangsdaten fehlen. Bitte NAS_URL, NAS_USER und NAS_PASSWORD Secrets hinterlegen.' }, { status: 500 });
  }

  // Sanitize path segments
  const sanitizePathSegment = (segment: string): string => {
    return (segment || '')
      .replace(/^\/+|\/+$/g, '') // remove leading/trailing slashes
      .replace(/\.\.+/g, '')     // prevent path traversal
      .trim();
  };

  const cleanFirma = sanitizePathSegment(firma);
  const cleanProjekt = sanitizePathSegment(projekt);

  if (!cleanFirma || !cleanProjekt) {
    return Response.json({ success: false, error: 'Firma oder Projekt Name ist ungueltig nach Bereinigung.' }, { status: 400 });
  }

  const folderPath = `/Kunde/${cleanFirma}/${cleanProjekt}`;

  let baseUrl = NAS_URL;
  if (!baseUrl.startsWith('http://') && !baseUrl.startsWith('https://')) {
    baseUrl = `https://${baseUrl}`;
  }

  // Deno HTTP client for accepting self-signed certs (if running in Deno)
  let client: any = null;
  try {
    if (typeof Deno !== 'undefined' && (Deno as any).createHttpClient) {
      client = (Deno as any).createHttpClient({ acceptInvalidCerts: true });
    }
  } catch (e) {
    // Ignore error
  }

  const fetchOptions: any = {};
  if (client) {
    fetchOptions.client = client;
  }

  const fetchWithTimeout = async (url: string, options: any = {}, timeoutMs = 15000) => {
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        ...options,
        signal: controller.signal,
        ...fetchOptions,
      });
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error('Connection timeout');
      }
      throw err;
    } finally {
      clearTimeout(id);
    }
  };

  let authPath = 'auth.cgi';
  let sid: string | null = null;

  try {
    // Step 1: Query API Info
    let infoJson: any;
    try {
      const infoUrl = `${baseUrl}/webapi/query.cgi?api=SYNO.API.Info&method=Query&version=1&query=SYNO.API.Auth,SYNO.FileStation.List,SYNO.FileStation.Upload,SYNO.FileStation.CreateFolder,SYNO.FileStation.Sharing`;
      const infoRes = await fetchWithTimeout(infoUrl, {}, 10000);
      if (!infoRes.ok) {
        throw new Error(`HTTP Status ${infoRes.status}`);
      }
      infoJson = await infoRes.json();
    } catch (err) {
      // NAS is unreachable
      return Response.json({
        success: false,
        error: 'NAS nicht erreichbar. Port-Forwarding pruefen.',
        reachable: false,
        details: err instanceof Error ? err.message : String(err)
      }, { status: 503 });
    }

    if (!infoJson.success) {
      return Response.json({ success: false, error: `Fehler bei API-Abfrage auf dem NAS: ${JSON.stringify(infoJson.error || infoJson)}` }, { status: 502 });
    }

    authPath = infoJson.data?.['SYNO.API.Auth']?.path || 'auth.cgi';

    // Step 2: Login
    let loginJson: any;
    try {
      const loginUrl = `${baseUrl}/webapi/${authPath}?api=SYNO.API.Auth&method=Login&version=3&account=${encodeURIComponent(NAS_USER)}&passwd=${encodeURIComponent(NAS_PASSWORD)}&session=FileStation&format=sid`;
      const loginRes = await fetchWithTimeout(loginUrl, {}, 10000);
      if (!loginRes.ok) {
        throw new Error(`HTTP Status ${loginRes.status}`);
      }
      loginJson = await loginRes.json();
    } catch (err) {
      return Response.json({
        success: false,
        error: 'NAS nicht erreichbar. Port-Forwarding pruefen.',
        reachable: false,
        details: err instanceof Error ? err.message : String(err)
      }, { status: 503 });
    }

    if (!loginJson.success) {
      return Response.json({ success: false, error: `NAS Login fehlgeschlagen. Bitte Zugangsdaten pruefen. Fehler: ${JSON.stringify(loginJson.error || loginJson)}` }, { status: 401 });
    }

    sid = loginJson.data?.sid;
    if (!sid) {
      return Response.json({ success: false, error: 'Keine Session-ID (sid) vom NAS erhalten.' }, { status: 502 });
    }

    // Step 3: Execute Action
    if (action === 'list') {
      const listUrl = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.List&method=list&version=2&folder_path=${encodeURIComponent(JSON.stringify([folderPath]))}&additional=${encodeURIComponent(JSON.stringify(['size', 'time']))}&_sid=${sid}`;
      const listRes = await fetchWithTimeout(listUrl, {}, 15000);
      const listJson = await listRes.json();

      if (!listJson.success) {
        const errorCode = listJson.error?.code || listJson.errors?.[0]?.code;
        if (errorCode === 409) {
          // Folder does not exist, create it!
          const lastSlash = folderPath.lastIndexOf('/');
          const parentPath = folderPath.substring(0, lastSlash);
          const folderName = folderPath.substring(lastSlash + 1);

          const createUrl = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&method=create&version=2&folder_path=${encodeURIComponent(JSON.stringify([parentPath]))}&name=${encodeURIComponent(JSON.stringify([folderName]))}&force_parent=true&_sid=${sid}`;
          const createRes = await fetchWithTimeout(createUrl, {}, 15000);
          const createJson = await createRes.json();

          if (!createJson.success) {
            return Response.json({ success: false, error: `Ordner existiert nicht und Erstellung ist fehlgeschlagen: ${JSON.stringify(createJson.error || createJson)}` }, { status: 502 });
          }

          return Response.json({ success: true, files: [], folderPath });
        } else {
          return Response.json({ success: false, error: `Fehler beim Auflisten der Dateien: ${JSON.stringify(listJson.error || listJson)}` }, { status: 502 });
        }
      }

      const files = (listJson.data?.files || []).map((f: any) => ({
        name: f.name,
        size: f.additional?.size ?? 0,
        modified: f.additional?.time?.mtime ? new Date(f.additional.time.mtime * 1000).toISOString() : null,
        path: f.path
      }));

      return Response.json({ success: true, files, folderPath });
    }

    if (action === 'upload') {
      if (!fileName || !fileBase64) {
        return Response.json({ success: false, error: 'Dateiname (fileName) und Dateiinhalt (fileBase64) sind erforderlich fuer Upload.' }, { status: 400 });
      }

      // First ensure folder exists (create if needed)
      try {
        const lastSlash = folderPath.lastIndexOf('/');
        const parentPath = folderPath.substring(0, lastSlash);
        const folderName = folderPath.substring(lastSlash + 1);

        const createUrl = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.CreateFolder&method=create&version=2&folder_path=${encodeURIComponent(JSON.stringify([parentPath]))}&name=${encodeURIComponent(JSON.stringify([folderName]))}&force_parent=true&_sid=${sid}`;
        const createRes = await fetchWithTimeout(createUrl, {}, 15000);
        const createJson = await createRes.json();
        // If error is not 414 (already exists) we don't crash since upload has create_parents=true
      } catch (err) {
        console.log('Ordnervorprüfung fehlgeschlagen, fahre mit Upload fort:', err);
      }

      // Decode base64 to Buffer
      let fileBuffer: Uint8Array;
      try {
        // Buffer is globally available in modern environments, or we can use standard Base64 decoding in Deno
        if (typeof Buffer !== 'undefined') {
          fileBuffer = Buffer.from(fileBase64, 'base64');
        } else {
          // Standard Deno fallback for base64 decoding
          const binaryString = atob(fileBase64);
          fileBuffer = new Uint8Array(binaryString.length);
          for (let i = 0; i < binaryString.length; i++) {
            fileBuffer[i] = binaryString.charCodeAt(i);
          }
        }
      } catch (err) {
        return Response.json({ success: false, error: 'Dekodieren des Base64-Inhalts ist fehlgeschlagen.' }, { status: 400 });
      }

      const formData = new FormData();
      formData.append('path', folderPath);
      formData.append('overwrite', 'true');
      formData.append('create_parents', 'true');
      
      const fileBlob = new Blob([fileBuffer], { type: 'application/octet-stream' });
      formData.append('file', fileBlob, fileName);

      const uploadUrl = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.Upload&method=upload&version=2&_sid=${sid}`;
      // Use higher timeout for uploads (e.g. 60 seconds)
      const uploadRes = await fetchWithTimeout(uploadUrl, {
        method: 'POST',
        body: formData,
      }, 60000);
      const uploadJson = await uploadRes.json();

      if (!uploadJson.success) {
        return Response.json({ success: false, error: `Dateiupload fehlgeschlagen: ${JSON.stringify(uploadJson.error || uploadJson)}` }, { status: 502 });
      }

      return Response.json({ success: true, fileName });
    }

    if (action === 'share') {
      if (!fileName) {
        return Response.json({ success: false, error: 'Dateiname (fileName) ist erforderlich fuer Freigabe.' }, { status: 400 });
      }

      const filePath = `${folderPath}/${sanitizePathSegment(fileName)}`;
      const shareUrl = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.Sharing&method=create&version=3&path=${encodeURIComponent(JSON.stringify([filePath]))}&_sid=${sid}`;
      const shareRes = await fetchWithTimeout(shareUrl, {}, 15000);
      const shareJson = await shareRes.json();

      if (!shareJson.success) {
        return Response.json({ success: false, error: `Freigabe-Link konnte nicht erstellt werden: ${JSON.stringify(shareJson.error || shareJson)}` }, { status: 502 });
      }

      const url = shareJson.data?.links?.[0]?.url;
      if (!url) {
        return Response.json({ success: false, error: `Keine Freigabe-URL in der Antwort des NAS gefunden: ${JSON.stringify(shareJson)}` }, { status: 502 });
      }

      return Response.json({ success: true, url });
    }

    return Response.json({ success: false, error: 'Unbekannte Aktion.' }, { status: 400 });

  } catch (err: any) {
    return Response.json({
      success: false,
      error: `Ein unerwarteter Fehler ist aufgetreten: ${err.message || String(err)}`
    }, { status: 500 });
  } finally {
    if (sid) {
      try {
        const logoutUrl = `${baseUrl}/webapi/${authPath}?api=SYNO.API.Auth&method=Logout&version=3&session=FileStation&_sid=${sid}`;
        await fetchWithTimeout(logoutUrl, {}, 5000);
      } catch (logoutErr) {
        console.error('Logout failed:', logoutErr);
      }
    }
  }
});
