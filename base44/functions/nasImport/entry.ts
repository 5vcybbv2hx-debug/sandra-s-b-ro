import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

if (typeof process !== 'undefined') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const BASE_PATH = "/Bautechnik Hugendubel/0_Kunden";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    
    let body: any = {};
    try { body = await req.json(); } catch {}
    
    const { action } = body;
    
    const NAS_URL = Deno.env.get('NAS_URL') || process.env?.NAS_URL;
    const NAS_USER = Deno.env.get('NAS_USER') || process.env?.NAS_USER;
    const NAS_PASSWORD = Deno.env.get('NAS_PASSWORD') || process.env?.NAS_PASSWORD;
    
    if (!NAS_URL || !NAS_USER || !NAS_PASSWORD) {
      return Response.json({ success: false, error: 'NAS secrets missing' }, { status: 500 });
    }
    
    let baseUrl = NAS_URL.startsWith('http') ? NAS_URL : `https://${NAS_URL}`;
    
    let client: any = null;
    try {
      if (typeof Deno !== 'undefined' && (Deno as any).createHttpClient) {
        client = (Deno as any).createHttpClient({ acceptInvalidCerts: true });
      }
    } catch {}
    
    const fetchOpts: any = client ? { client } : {};
    
    const fetchWithTimeout = async (url: string, opts: any = {}, ms = 15000) => {
      const c = new AbortController();
      const id = setTimeout(() => c.abort(), ms);
      try {
        return await fetch(url, { ...opts, signal: c.signal, ...fetchOpts });
      } finally { clearTimeout(id); }
    };
    
    // Login v6 POST
    const loginBody = new URLSearchParams();
    loginBody.append('api', 'SYNO.API.Auth');
    loginBody.append('method', 'Login');
    loginBody.append('version', '6');
    loginBody.append('account', NAS_USER);
    loginBody.append('passwd', NAS_PASSWORD);
    loginBody.append('session', 'FileStation');
    loginBody.append('format', 'sid');
    
    const loginRes = await fetchWithTimeout(`${baseUrl}/webapi/entry.cgi`, {
      method: 'POST',
      body: loginBody,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    }, 10000);
    const loginJson = await loginRes.json();
    
    if (!loginJson.success) {
      return Response.json({ success: false, error: `NAS login failed: ${JSON.stringify(loginJson.error)}` }, { status: 401 });
    }
    const sid = loginJson.data.sid;
    
    const listFolder = async (folder: string) => {
      const encoded = encodeURIComponent(JSON.stringify(folder));
      const url = `${baseUrl}/webapi/entry.cgi?api=SYNO.FileStation.List&method=list&version=2&folder_path=${encoded}&_sid=${sid}`;
      try {
        const res = await fetchWithTimeout(url, {}, 10000);
        if (!res.ok) return [];
        const data = await res.json();
        if (data.success) return data.data?.files || [];
        return [];
      } catch { return []; }
    };
    
    // SCAN: list all customer folders
    const customers = (await listFolder(BASE_PATH)).filter((f: any) => f.isdir && !f.name.startsWith('#') && !f.name.startsWith('_'));
    
    const results: any[] = [];
    
    for (const customer of customers) {
      const customerName = customer.name;
      const customerPath = `${BASE_PATH}/${customerName}`;
      
      // List projects under this customer
      const projects = (await listFolder(customerPath)).filter((f: any) => f.isdir && !f.name.startsWith('#'));
      
      // Detect phase folders to determine current phase
      const phaseMap: Record<string, string> = {
        '1_unterlagen': 'Entwurf',
        '2_vorabzug': 'Entwurf',
        '3_baugesuch': 'Baugesuch',
        '4_werkplanung': 'Werkplanung',
        '5_gesannte': 'Werkplanung',
        '6_teilung': 'Werkplanung',
      };
      
      for (const proj of projects) {
        const projName = proj.name;
        const projPath = `${customerPath}/${projName}`;
        
        // Skip archive and general folders
        const lowerName = projName.toLowerCase();
        if (lowerName === '0_archiv' || lowerName === 'allgemein' || lowerName === 'allgemeines' || lowerName.startsWith('0_')) {
          continue;
        }
        
        // Check subfolders for phase detection
        const subDirs = (await listFolder(projPath)).filter((f: any) => f.isdir && !f.name.startsWith('#'));
        let detectedPhase = 'Entwurf';
        
        for (const sub of subDirs) {
          const subLower = sub.name.toLowerCase().trim();
          if (subLower.includes('4_werkplanung') || subLower.includes('werkplanung')) {
            detectedPhase = 'Werkplanung';
            break;
          }
          if (subLower.includes('3_baugesuch') || subLower.includes('baugesuch')) {
            detectedPhase = 'Baugesuch';
          }
        }
        
        // Detect project status
        let status = 'Aktiv';
        const parentLower = customerName.toLowerCase();
        if (parentLower.includes('archiv') || lowerName.includes('archiv')) {
          status = 'Archiviert';
        }
        
        results.push({
          firma_name: customerName,
          projekt_name: projName,
          nas_path: projPath,
          detected_phase: detectedPhase,
          status,
          subfolder_count: subDirs.length,
        });
      }
    }
    
    // Now create/update entities via Base44 SDK
    let createdFirmen = 0;
    let createdProjekte = 0;
    let updatedProjekte = 0;
    let skipped = 0;
    
    // Get existing Firmen
    const existingFirmen = await base44.entities.Firma.list({ limit: 500 });
    const firmaMap = new Map<string, string>();
    for (const f of existingFirmen) {
      firmaMap.set(f.data.name.toLowerCase(), f.id);
    }
    
    // Get existing Projekte
    const existingProjekte = await base44.entities.Projekt.list({ limit: 500 });
    const projektMap = new Map<string, any>();
    for (const p of existingProjekte) {
      projektMap.set(`${p.data.firma_id}__${p.data.projekt_name.toLowerCase()}`, p);
    }
    
    // Add nas_path to Projekt schema if not present (we'll store it in notizen for now)
    
    for (const item of results) {
      // Find or create Firma
      let firmaId = firmaMap.get(item.firma_name.toLowerCase());
      
      if (!firmaId) {
        // Determine branche from name
        let branche = 'Sonstiges';
        const nameLower = item.firma_name.toLowerCase();
        if (nameLower.includes('architekt')) branche = 'Architekturbüro';
        else if (nameLower.includes('bauwerk') || nameLower.includes('baugesellschaft') || nameLower.includes('wohnbau') || nameLower.includes('bauträger')) branche = 'Bauträger';
        else if (nameLower.includes('bauherren') || nameLower.includes('private')) branche = 'Privatperson';
        else if (nameLower.includes('gemeinde') || nameLower.includes('stadt') || nameLower.includes('kreis')) branche = 'Behörde';
        else if (nameLower.includes('haus-manufaktur') || nameLower.includes('haus-manufaktur') || nameLower.includes('manufaktur')) branche = 'Bauunternehmen';
        
        try {
          const newFirma = await base44.entities.Firma.create({
            name: item.firma_name,
            branche,
            aktiv: item.status !== 'Archiviert',
          });
          firmaId = newFirma.id;
          firmaMap.set(item.firma_name.toLowerCase(), firmaId);
          createdFirmen++;
        } catch (e) {
          console.error(`Failed to create Firma ${item.firma_name}:`, e);
          skipped++;
          continue;
        }
      }
      
      // Find or create Projekt
      const mapKey = `${firmaId}__${item.projekt_name.toLowerCase()}`;
      const existing = projektMap.get(mapKey);
      
      // Store NAS path in notizen field
      const nasNote = `[NAS-Pfad: ${item.nas_path}]`;
      
      if (existing) {
        // Update if nas_path not already in notizen
        const currentNotes = existing.data.notizen || '';
        if (!currentNotes.includes('[NAS-Pfad:')) {
          try {
            await base44.entities.Projekt.update(existing.id, {
              notizen: currentNotes ? `${currentNotes}\n${nasNote}` : nasNote,
              aktuelle_phase: item.detected_phase,
            });
            updatedProjekte++;
          } catch (e) {
            console.error(`Failed to update Projekt ${item.projekt_name}:`, e);
            skipped++;
          }
        } else {
          skipped++;
        }
      } else {
        try {
          await base44.entities.Projekt.create({
            projekt_name: item.projekt_name,
            firma_id: firmaId,
            aktuelle_phase: item.detected_phase,
            status: item.status,
            notizen: nasNote,
          });
          createdProjekte++;
        } catch (e) {
          console.error(`Failed to create Projekt ${item.projekt_name}:`, e);
          skipped++;
        }
      }
    }
    
    // Logout
    try {
      const logoutBody = new URLSearchParams();
      logoutBody.append('api', 'SYNO.API.Auth');
      logoutBody.append('method', 'Logout');
      logoutBody.append('version', '6');
      logoutBody.append('session', 'FileStation');
      logoutBody.append('_sid', sid);
      await fetchWithTimeout(`${baseUrl}/webapi/entry.cgi`, {
        method: 'POST',
        body: logoutBody,
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      }, 5000);
    } catch {}
    
    return Response.json({
      success: true,
      scanned: results.length,
      customers_found: customers.length,
      firmen_created: createdFirmen,
      projekte_created: createdProjekte,
      projekte_updated: updatedProjekte,
      skipped,
      details: results.slice(0, 50),
    });
    
  } catch (err: any) {
    return Response.json({
      success: false,
      error: `Import failed: ${err.message || String(err)}`,
    }, { status: 500 });
  }
});
