// nasProjectCheck — read-only NAS-Ordnerabgleich (Pierre, 14.10.)
// Bewusste Ausnahme vom Feature-Stopp. NUR lesend: keine Schreibzugriffe auf die NAS,
// keine Datenbank-Änderungen. Liefert Rohdaten für das Matching durch Elara.
import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

Deno.serve(async (req) => {
  let base44;
  try {
    base44 = createClientFromRequest(req);
  } catch (e) {
    return Response.json({ success: false, error: 'Authentifizierung fehlgeschlagen.' }, { status: 401 });
  }

  const NAS_URL = Deno.env.get('NAS_URL') || (typeof process !== 'undefined' ? process.env?.NAS_URL : undefined);
  const NAS_USER = Deno.env.get('NAS_USER') || (typeof process !== 'undefined' ? process.env?.NAS_USER : undefined);
  const NAS_PASSWORD = Deno.env.get('NAS_PASSWORD') || (typeof process !== 'undefined' ? process.env?.NAS_PASSWORD : undefined);
  const NAS_PROJECTS_PATH = Deno.env.get('NAS_PROJECTS_PATH') || (typeof process !== 'undefined' ? process.env?.NAS_PROJECTS_PATH : undefined);

  if (!NAS_URL || !NAS_USER || !NAS_PASSWORD) {
    return Response.json({ success: false, error: 'NAS Zugangsdaten fehlen.' }, { status: 500 });
  }

  const baseUrl = NAS_URL.startsWith('http') ? NAS_URL : `https://${NAS_URL}`;

  // acceptInvalidCerts wie nasContacts (Self-signed Synology certs)
  let client: any = null;
  try {
    if (typeof Deno !== 'undefined' && (Deno as any).createHttpClient) {
      client = (Deno as any).createHttpClient({ acceptInvalidCerts: true });
    }
  } catch {}
  const fetchOpts: any = client ? { client } : {};

  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 25000) => {
    const c = new AbortController();
    const id = setTimeout(() => c.abort(), ms);
    try {
      return await fetch(url, { ...opts, signal: c.signal, ...fetchOpts });
    } catch (err: any) {
      if (err.name === 'AbortError') throw new Error('Timeout');
      throw err;
    } finally {
      clearTimeout(id);
    }
  };

  const errors: string[] = [];
  let sid: string | null = null;

  // ─── 1. DSM Login (SYNO.API.Auth) ───────────────────────────────
  async function nasLogin(): Promise<string | null> {
    // Try version 7 first, then fall back to version 6
    for (const version of [7, 6]) {
      try {
        const params = new URLSearchParams({
          api: 'SYNO.API.Auth',
          version: String(version),
          method: 'login',
          account: NAS_USER!,
          passwd: NAS_PASSWORD!,
          session: 'FileStation',
          format: 'cookie',
        });
        const res = await fetchWithTimeout(`${baseUrl}/webapi/auth.cgi?${params.toString()}`, {}, 15000);
        const data = await res.json();
        if (data?.success && data?.data?.sid) {
          return data.data.sid as string;
        }
        // If version 7 requires format=sid or different params, capture error for reporting
        if (!data?.success) {
          const code = data?.error?.code;
          if (version === 6) errors.push(`Login v6 fehlgeschlagen (code ${code ?? 'unknown'}): ${data?.error?.errors?.[0]?.message ?? 'keine SID'}`);
        }
      } catch (e: any) {
        if (version === 6) errors.push(`Login v6 Fehler: ${e.message}`);
      }
    }
    return null;
  }

  async function nasLogout(s: string): Promise<void> {
    try {
      const params = new URLSearchParams({
        api: 'SYNO.API.Auth',
        version: '6',
        method: 'logout',
        session: 'FileStation',
        _sid: s,
      });
      await fetchWithTimeout(`${baseUrl}/webapi/auth.cgi?${params.toString()}`, {}, 10000);
    } catch {}
  }

  // ─── 2. FileStation List ───────────────────────────────────────
  async function listShares(s: string): Promise<any[]> {
    const params = new URLSearchParams({
      api: 'SYNO.FileStation.List',
      version: '2',
      method: 'list',
      additional: '["shares"]',
      _sid: s,
    });
    const res = await fetchWithTimeout(`${baseUrl}/webapi/entry.cgi?${params.toString()}`, {}, 20000);
    const data = await res.json();
    if (!data?.success) {
      const code = data?.error?.code;
      // code 402 -> FileStation nicht installiert; code 403 -> keine Berechtigung
      let msg = `FileStation list shares fehlgeschlagen (code ${code ?? 'unknown'})`;
      if (code === 402) msg = 'FileStation nicht installiert oder keine Berechtigung';
      throw new Error(msg);
    }
    return data?.data?.shares ?? [];
  }

  async function listFolder(s: string, folderPath: string): Promise<string[]> {
    const params = new URLSearchParams({
      api: 'SYNO.FileStation.List',
      version: '2',
      method: 'list',
      folder_path: JSON.stringify([folderPath]),
      _sid: s,
    });
    const res = await fetchWithTimeout(`${baseUrl}/webapi/entry.cgi?${params.toString()}`, {}, 20000);
    const data = await res.json();
    if (!data?.success) return [];
    const files = data?.data?.files ?? [];
    return files.map((f: any) => f?.name).filter((n: any) => !!n);
  }

  // ─── Main ──────────────────────────────────────────────────────
  try {
    // 30s Gesamt-Timeout absichern
    const overallDeadline = Date.now() + 30000;

    // 1. Login
    sid = await nasLogin();
    if (!sid) {
      return Response.json({
        success: false,
        error: 'NAS Login fehlgeschlagen. Zugangsdaten oder Berechtigung prüfen.',
        errors,
        shares: [],
        folders: [],
        projects: [],
      }, { status: 401 });
    }

    // 2. Shares listen
    let shares: any[] = [];
    try {
      shares = await listShares(sid);
    } catch (e: any) {
      errors.push(e.message);
      await nasLogout(sid).catch(() => {});
      return Response.json({
        success: false,
        error: e.message,
        errors,
        shares: [],
        folders: [],
        projects: [],
      }, { status: 500 });
    }

    // 3. Share-Auswahl: NAS_PROJECTS_PATH (komma-separierte Share-Namen) falls gesetzt,
    //    sonst Shares mit "projekt" im Namen (case-insensitiv), sonst alle
    let targetShares: any[] = [];
    const shareNames: string[] = shares.map((sh: any) => sh?.path ?? sh?.name).filter((n: any) => !!n);
    if (NAS_PROJECTS_PATH) {
      const configured = NAS_PROJECTS_PATH.split(',').map(s => s.trim()).filter(Boolean);
      targetShares = shares.filter((sh: any) => {
        const name = sh?.path ?? sh?.name;
        return configured.some(c => name === c || name === `/${c}` || name.endsWith(`/${c}`));
      });
      if (targetShares.length === 0) {
        // Fallback: interpretiere NAS_PROJECTS_PATH als einzelnen Share-Pfad
        targetShares = [{ path: NAS_PROJECTS_PATH, name: NAS_PROJECTS_PATH }];
      }
    } else {
      const projektShares = shares.filter((sh: any) => {
        const name = (sh?.path ?? sh?.name ?? '').toLowerCase();
        return name.includes('projekt');
      });
      targetShares = projektShares.length > 0 ? projektShares : shares;
    }

    // 4. Oberste Ordnerebene pro Share listen (parallel, aber Zeitbudget achten)
    const folders: { share: string; name: string }[] = [];
    const folderTasks = targetShares.map(async (sh: any) => {
      if (Date.now() > overallDeadline) return;
      const sharePath = sh?.path ?? sh?.name;
      try {
        const names = await listFolder(sid!, sharePath);
        for (const name of names) folders.push({ share: sharePath, name });
      } catch (e: any) {
        errors.push(`Ordnerliste für ${sharePath}: ${e.message}`);
      }
    });
    await Promise.all(folderTasks);

    // 5. App-Projekte parallel lesen (nur projekt_name, status, is_internal)
    let projects: any[] = [];
    try {
      const result = await base44.entities.Projekt.filter({}, { fields: ['projekt_name', 'status', 'is_internal'], limit: 1000 });
      const items = (result as any)?.items ?? result ?? [];
      projects = (items as any[]).map((p: any) => ({
        projekt_name: p?.projekt_name ?? '',
        status: p?.status ?? '',
        is_internal: p?.is_internal ?? false,
      }));
    } catch (e: any) {
      errors.push(`Projekte lesen: ${e.message}`);
    }

    // 6. Logout
    await nasLogout(sid).catch(() => {});

    // 7. Rohdaten zurückgeben — KEIN Matching (macht Elara)
    return Response.json({
      success: true,
      shares: shareNames,
      folders,
      projects,
      errors,
    });
  } catch (e: any) {
    if (sid) await nasLogout(sid).catch(() => {});
    console.error('nasProjectCheck error:', e);
    return Response.json({ success: false, error: e.message || 'Unbekannter Fehler', errors, shares: [], folders: [], projects: [] }, { status: 500 });
  }
});