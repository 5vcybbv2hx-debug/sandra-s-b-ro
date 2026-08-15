import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';
// nasContacts v3 — standard CardDAV discovery chain & enhanced debug

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

  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ success: false, error: 'Ungueltiges JSON.' }, { status: 400 });
  }

  const { action } = body;

  const NAS_URL = Deno.env.get('NAS_URL') || (typeof process !== 'undefined' ? process.env?.NAS_URL : undefined);
  const NAS_USER = Deno.env.get('NAS_USER') || (typeof process !== 'undefined' ? process.env?.NAS_USER : undefined);
  const NAS_PASSWORD = Deno.env.get('NAS_PASSWORD') || (typeof process !== 'undefined' ? process.env?.NAS_PASSWORD : undefined);

  if (!NAS_URL || !NAS_USER || !NAS_PASSWORD) {
    return Response.json({ success: false, error: 'NAS Zugangsdaten fehlen.' }, { status: 500 });
  }

  let baseUrl = NAS_URL.startsWith('http') ? NAS_URL : `https://${NAS_URL}`;
  const carddavBase = `${baseUrl}/carddav`;

  let client: any = null;
  try {
    if (typeof Deno !== 'undefined' && (Deno as any).createHttpClient) {
      client = (Deno as any).createHttpClient({ acceptInvalidCerts: true });
    }
  } catch {}

  const fetchOpts: any = client ? { client } : {};
  const authHeader = 'Basic ' + btoa(`${NAS_USER}:${NAS_PASSWORD}`);

  const fetchWithTimeout = async (url: string, opts: any = {}, ms = 20000) => {
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

  // ─── vCard Helpers ──────────────────────────────────────────────

  function escapeVCard(str: string): string {
    if (!str) return '';
    return str.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
  }

  function buildFirmaVCard(firma: any): string {
    const uid = `app-firma-${firma.id}`;
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `UID:${uid}`,
      `FN:${escapeVCard(firma.name || 'Unbenannt')}`,
      `N:;${escapeVCard(firma.name || 'Unbenannt')};;;`,
      `ORG:${escapeVCard(firma.name || '')}`,
    ];
    if (firma.strasse || firma.ort || firma.plz) {
      const adr = `ADR;TYPE=WORK:;;${escapeVCard(firma.strasse || '')};${escapeVCard(firma.ort || '')};${escapeVCard(firma.plz || '')};;${escapeVCard(firma.land || 'Deutschland')}`;
      lines.push(adr);
    }
    if (firma.telefon) lines.push(`TEL;TYPE=WORK:${escapeVCard(firma.telefon)}`);
    if (firma.email) lines.push(`EMAIL:${escapeVCard(firma.email)}`);
    if (firma.website) lines.push(`URL:${escapeVCard(firma.website)}`);
    if (firma.branche) lines.push(`NOTE:${escapeVCard(firma.branche)}`);
    lines.push('CATEGORIES:Kunde,Firma');
    if (firma.aktiv === false) lines.push('X-ACTIVE:false');
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  function buildAnsprechpartnerVCard(person: any, firmaName?: string): string {
    const uid = `app-ansprechpartner-${person.id}`;
    const fn = `${person.vorname || ''} ${person.nachname || ''}`.trim() || 'Unbenannt';
    const lines = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `UID:${uid}`,
      `FN:${escapeVCard(fn)}`,
      `N:${escapeVCard(person.nachname || '')};${escapeVCard(person.vorname || '')};;;`,
    ];
    if (firmaName) lines.push(`ORG:${escapeVCard(firmaName)}`);
    if (person.rolle) lines.push(`TITLE:${escapeVCard(person.rolle)}`);
    if (person.telefon) lines.push(`TEL;TYPE=WORK:${escapeVCard(person.telefon)}`);
    if (person.mobil) lines.push(`TEL;TYPE=CELL:${escapeVCard(person.mobil)}`);
    if (person.email) lines.push(`EMAIL:${escapeVCard(person.email)}`);
    lines.push('CATEGORIES:Kunde,Ansprechpartner');
    lines.push('END:VCARD');
    return lines.join('\r\n');
  }

  function parseVCard(vcard: string): any {
    const lines = vcard.split(/\r\n|\r|\n/);
    const contact: any = {};
    let inVCard = false;

    for (const line of lines) {
      if (line.startsWith('BEGIN:VCARD')) { inVCard = true; continue; }
      if (line.startsWith('END:VCARD')) { inVCard = false; continue; }
      if (!inVCard) continue;

      const colonIdx = line.indexOf(':');
      if (colonIdx === -1) continue;

      const propPart = line.substring(0, colonIdx);
      const value = line.substring(colonIdx + 1);
      const propName = propPart.split(';')[0].toUpperCase();

      if (propName === 'UID') contact.uid = value;
      else if (propName === 'FN') contact.fn = value;
      else if (propName === 'N') {
        const parts = value.split(';');
        contact.nachname = parts[0] || '';
        contact.vorname = parts[1] || '';
      } else if (propName === 'ORG') contact.org = value;
      else if (propName === 'TITLE') contact.titel = value;
      else if (propName === 'EMAIL') contact.email = value;
      else if (propName === 'TEL') contact.tel = contact.tel || value;
      else if (propName === 'URL') contact.url = value;
      else if (propName === 'NOTE') contact.note = value;
      else if (propName === 'ADR') {
        const parts = value.split(';');
        contact.strasse = parts[2] || '';
        contact.ort = parts[3] || '';
        contact.plz = parts[5] || '';
        contact.land = parts[6] || '';
      } else if (propName === 'CATEGORIES') {
        contact.categories = value.split(',');
      }
    }

    if (contact.uid?.startsWith('app-firma-')) {
      contact.type = 'firma';
      contact.entityId = contact.uid.replace('app-firma-', '');
    } else if (contact.uid?.startsWith('app-ansprechpartner-')) {
      contact.type = 'ansprechpartner';
      contact.entityId = contact.uid.replace('app-ansprechpartner-', '');
    } else {
      contact.type = 'external';
    }

    return contact;
  }

  // ─── XML Helpers ────────────────────────────────────────────────

  function extractFromXml(xml: string, tag: string): string[] {
    const regex = new RegExp(`<(?:[a-z]+:)?${tag}[^>]*>([^<]+)<\\/(?:[a-z]+:)?${tag}>`, 'gi');
    const matches = xml.match(regex) || [];
    return matches.map(m => m.replace(/<[^>]+>/g, '').trim());
  }

  // ─── CardDAV Discovery (v3 — standard compliant) ────────────────

  async function discoverAddressBook(): Promise<string | null> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <d:current-user-principal />
    <card:addressbook-home-set />
  </d:prop>
</d:propfind>`;

    // Step 1: PROPFIND on CardDAV root to get current-user-principal
    let principalHref: string | null = null;
    let homeSetHref: string | null = null;

    try {
      const res = await fetchWithTimeout(`${carddavBase}/`, {
        method: 'PROPFIND',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/xml; charset=utf-8',
          'Depth': '0',
        },
        body: propfindBody,
      }, 10000);

      if (res.ok || res.status === 207) {
        const text = await res.text();

        // Extract current-user-principal
        const principalMatches = extractFromXml(text, 'href');
        // current-user-principal contains an href — find it
        const principalMatch = text.match(/<(?:d:)?current-user-principal[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
        if (principalMatch) {
          principalHref = principalMatch[1].trim();
        }

        // Extract addressbook-home-set if present
        const homeSetMatch = text.match(/<(?:card:)?addressbook-home-set[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
        if (homeSetMatch) {
          homeSetHref = homeSetMatch[1].trim();
        }
      }
    } catch {}

    // Step 2: If we have addressbook-home-set, use it
    if (homeSetHref) {
      const homeUrl = homeSetHref.startsWith('http') ? homeSetHref : `${baseUrl}${homeSetHref}`;
      try {
        const res = await fetchWithTimeout(homeUrl, {
          method: 'PROPFIND',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1',
          },
          body: propfindBody,
        }, 10000);

        if (res.ok || res.status === 207) {
          const text = await res.text();
          const hrefs = extractFromXml(text, 'href');
          // Find the first address book (skip the home itself)
          for (const href of hrefs) {
            if (href !== homeSetHref && href.endsWith('/')) {
              return href.startsWith('http') ? href : `${baseUrl}${href}`;
            }
          }
          // If only the home itself, it might be the address book
          return homeUrl;
        }
      } catch {}
    }

    // Step 3: Follow current-user-principal to find address books
    if (principalHref) {
      const principalUrl = principalHref.startsWith('http') ? principalHref : `${baseUrl}${principalHref}`;

      try {
        const res = await fetchWithTimeout(principalUrl, {
          method: 'PROPFIND',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '0',
          },
          body: propfindBody,
        }, 10000);

        if (res.ok || res.status === 207) {
          const text = await res.text();

          // Look for addressbook-home-set in the principal response
          const homeMatch = text.match(/<(?:card:)?addressbook-home-set[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
          if (homeMatch) {
            const abHomeHref = homeMatch[1].trim();
            const abHomeUrl = abHomeHref.startsWith('http') ? abHomeHref : `${baseUrl}${abHomeHref}`;

            // PROPFIND on address book home to find actual address books
            const res2 = await fetchWithTimeout(abHomeUrl, {
              method: 'PROPFIND',
              headers: {
                'Authorization': authHeader,
                'Content-Type': 'application/xml; charset=utf-8',
                'Depth': '1',
              },
              body: propfindBody,
            }, 10000);

            if (res2.ok || res2.status === 207) {
              const text2 = await res2.text();
              const hrefs2 = extractFromXml(text2, 'href');
              for (const href of hrefs2) {
                if (href !== abHomeHref && href.endsWith('/')) {
                  return href.startsWith('http') ? href : `${baseUrl}${href}`;
                }
              }
              return abHomeUrl;
            }
          }
        }
      } catch {}

      // Step 4: Principal might itself be the address book home (Synology style)
      // Try PROPFIND Depth 1 on the principal to find address books
      try {
        const res = await fetchWithTimeout(principalUrl, {
          method: 'PROPFIND',
          headers: {
            'Authorization': authHeader,
            'Content-Type': 'application/xml; charset=utf-8',
            'Depth': '1',
          },
          body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
  </d:prop>
</d:propfind>`,
        }, 10000);

        if (res.ok || res.status === 207) {
          const text = await res.text();
          const hrefs = extractFromXml(text, 'href');

          for (const href of hrefs) {
            if (href === principalHref) continue;
            // Look for addressbook resourcetype or just any collection that ends with /
            if (href.endsWith('/')) {
              const fullUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;

              // Check if this is an addressbook collection
              const resCheck = await fetchWithTimeout(fullUrl, {
                method: 'PROPFIND',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/xml; charset=utf-8',
                  'Depth': '0',
                },
                body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:resourcetype />
    <d:displayname />
  </d:prop>
</d:propfind>`,
              }, 10000);

              if (resCheck.ok || resCheck.status === 207) {
                const checkText = await resCheck.text();
                // Check if it's an addressbook
                if (/addressbook/i.test(checkText) || /card/i.test(checkText)) {
                  return fullUrl;
                }
                // If it contains .vcf references, it's an address book
                if (/\.vcf/i.test(checkText)) {
                  return fullUrl;
                }
                // Just return the first child collection — might be the address book
                return fullUrl;
              }
            }
          }
        }
      } catch {}
    }

    return null;
  }

  // ─── CardDAV List ───────────────────────────────────────────────

  async function listContacts(addressBookUrl: string): Promise<any[]> {
    const propfindBody = `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:">
  <d:prop>
    <d:resourcetype />
    <d:getetag />
  </d:prop>
</d:propfind>`;

    const res = await fetchWithTimeout(addressBookUrl, {
      method: 'PROPFIND',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/xml; charset=utf-8',
        'Depth': '1',
      },
      body: propfindBody,
    }, 20000);

    if (!res.ok && res.status !== 207) {
      throw new Error(`PROPFIND failed: ${res.status}`);
    }

    const text = await res.text();
    const contacts: any[] = [];

    const hrefMatches = text.match(/<(?:[a-z]+:)?href[^>]*>([^<]+\.vcf[^<]*)<\/(?:[a-z]+:)?href>/gi) || [];
    const vcfHrefs = [...new Set(hrefMatches.map(m => m.replace(/<[^>]+>/g, '').trim()))];

    for (const href of vcfHrefs) {
      try {
        const vcfUrl = href.startsWith('http') ? href : `${baseUrl}${href}`;
        const getRes = await fetchWithTimeout(vcfUrl, {
          method: 'GET',
          headers: { 'Authorization': authHeader },
        }, 10000);

        if (getRes.ok) {
          const vcard = await getRes.text();
          const parsed = parseVCard(vcard);
          parsed.href = href;
          parsed.vcfUrl = vcfUrl;
          contacts.push(parsed);
        }
      } catch {}
    }

    return contacts;
  }

  // ─── CardDAV Push ───────────────────────────────────────────────

  async function pushContact(addressBookUrl: string, uid: string, vcard: string): Promise<string> {
    const abUrl = addressBookUrl.endsWith('/') ? addressBookUrl : `${addressBookUrl}/`;
    const vcfUrl = `${abUrl}${uid}.vcf`;

    const res = await fetchWithTimeout(vcfUrl, {
      method: 'PUT',
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'text/vcard; charset=utf-8',
      },
      body: vcard,
    }, 15000);

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`PUT ${res.status}: ${errText.substring(0, 200)}`);
    }

    return vcfUrl;
  }

  async function deleteContact(vcfUrl: string): Promise<boolean> {
    const res = await fetchWithTimeout(vcfUrl, {
      method: 'DELETE',
      headers: { 'Authorization': authHeader },
    }, 10000);
    return res.ok || res.status === 204;
  }

  // ─── Main Logic ─────────────────────────────────────────────────

  try {
    if (action === 'discover') {
      const abUrl = await discoverAddressBook();
      if (abUrl) {
        return Response.json({ success: true, addressBookUrl: abUrl });
      } else {
        let debugInfo: any = { carddavBase, nasUser: NAS_USER };
        try {
          const res = await fetchWithTimeout(`${carddavBase}/`, {
            method: 'PROPFIND',
            headers: {
              'Authorization': authHeader,
              'Content-Type': 'application/xml; charset=utf-8',
              'Depth': '0',
            },
            body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <d:current-user-principal />
    <card:addressbook-home-set />
  </d:prop>
</d:propfind>`,
          }, 10000);
          debugInfo.rootStatus = res.status;
          debugInfo.rootBody = (await res.text()).substring(0, 1500);

          // Also try PROPFIND on the principal
          if (debugInfo.rootBody) {
            const principalMatch = debugInfo.rootBody.match(/<(?:d:)?current-user-principal[^>]*>[\s\S]*?<(?:d:)?href[^>]*>([^<]+)<\/(?:d:)?href>/i);
            if (principalMatch) {
              const principalHref = principalMatch[1].trim();
              const principalUrl = `${baseUrl}${principalHref}`;
              const res2 = await fetchWithTimeout(principalUrl, {
                method: 'PROPFIND',
                headers: {
                  'Authorization': authHeader,
                  'Content-Type': 'application/xml; charset=utf-8',
                  'Depth': '1',
                },
                body: `<?xml version="1.0" encoding="utf-8"?>
<d:propfind xmlns:d="DAV:" xmlns:card="urn:ietf:params:xml:ns:carddav">
  <d:prop>
    <d:displayname />
    <d:resourcetype />
    <card:addressbook-home-set />
  </d:prop>
</d:propfind>`,
              }, 10000);
              debugInfo.principalUrl = principalUrl;
              debugInfo.principalStatus = res2.status;
              debugInfo.principalBody = (await res2.text()).substring(0, 1500);
            }
          }
        } catch (e: any) {
          debugInfo.error = e.message;
        }
        return Response.json({ success: false, error: 'Keine CardDAV Adresse gefunden.', debug: debugInfo }, { status: 404 });
      }
    }

    if (action === 'push') {
      const { type, entity, firmaName } = body;
      if (!entity || !entity.id) {
        return Response.json({ success: false, error: 'Entity mit ID erforderlich.' }, { status: 400 });
      }

      const abUrl = await discoverAddressBook();
      if (!abUrl) {
        return Response.json({ success: false, error: 'CardDAV Adressbuch nicht gefunden.' }, { status: 500 });
      }

      let uid: string;
      let vcard: string;

      if (type === 'firma') {
        uid = `app-firma-${entity.id}`;
        vcard = buildFirmaVCard(entity);
      } else if (type === 'ansprechpartner') {
        uid = `app-ansprechpartner-${entity.id}`;
        vcard = buildAnsprechpartnerVCard(entity, firmaName || '');
      } else {
        return Response.json({ success: false, error: 'Typ muss firma oder ansprechpartner sein.' }, { status: 400 });
      }

      const vcfUrl = await pushContact(abUrl, uid, vcard);
      return Response.json({ success: true, uid, vcfUrl });
    }

    if (action === 'delete') {
      const { uid } = body;
      if (!uid) {
        return Response.json({ success: false, error: 'UID erforderlich.' }, { status: 400 });
      }

      const abUrl = await discoverAddressBook();
      if (!abUrl) {
        return Response.json({ success: false, error: 'CardDAV nicht gefunden.' }, { status: 500 });
      }

      const vcfUrl = `${abUrl}${uid}.vcf`;
      const deleted = await deleteContact(vcfUrl);
      return Response.json({ success: deleted });
    }

    if (action === 'sync') {
      const abUrl = await discoverAddressBook();
      if (!abUrl) {
        return Response.json({ success: false, error: 'CardDAV nicht gefunden.' }, { status: 500 });
      }

      const contacts = await listContacts(abUrl);
      const appContacts = contacts.filter(c => c.type !== 'external');
      const externalContacts = contacts.filter(c => c.type === 'external');

      let updatedFirmen = 0;
      let updatedPersons = 0;
      let newFromNas = 0;

      for (const contact of appContacts) {
        try {
          if (contact.type === 'firma' && contact.entityId) {
            const existing = await base44.entities.Firma.get(contact.entityId);
            if (existing) {
              const updateData: any = {};
              if (contact.strasse && !existing.strasse) updateData.strasse = contact.strasse;
              if (contact.ort && !existing.ort) updateData.ort = contact.ort;
              if (contact.plz && !existing.plz) updateData.plz = contact.plz;
              if (contact.tel && !existing.telefon) updateData.telefon = contact.tel;
              if (contact.email && !existing.email) updateData.email = contact.email;
              if (contact.url && !existing.website) updateData.website = contact.url;
              if (Object.keys(updateData).length > 0) {
                await base44.entities.Firma.update(contact.entityId, updateData);
                updatedFirmen++;
              }
            }
          } else if (contact.type === 'ansprechpartner' && contact.entityId) {
            const existing = await base44.entities.Ansprechpartner.get(contact.entityId);
            if (existing) {
              const updateData: any = {};
              if (contact.tel && !existing.telefon && !existing.mobil) updateData.telefon = contact.tel;
              if (contact.email && !existing.email) updateData.email = contact.email;
              if (contact.titel && !existing.rolle) updateData.rolle = contact.titel;
              if (Object.keys(updateData).length > 0) {
                await base44.entities.Ansprechpartner.update(contact.entityId, updateData);
                updatedPersons++;
              }
            }
          }
        } catch {}
      }

      for (const contact of externalContacts) {
        try {
          if (contact.org && !contact.vorname && !contact.nachname) {
            const existing = await base44.entities.Firma.filter({ name: contact.org || contact.fn });
            if (!existing || existing.length === 0) {
              await base44.entities.Firma.create({
                name: contact.org || contact.fn,
                strasse: contact.strasse || '',
                ort: contact.ort || '',
                plz: contact.plz || '',
                telefon: contact.tel || '',
                email: contact.email || '',
                website: contact.url || '',
                aktiv: true,
              });
              newFromNas++;
            }
          } else if (contact.vorname || contact.nachname) {
            const fullName = `${contact.vorname} ${contact.nachname}`.trim();
            if (fullName) {
              const existing = await base44.entities.Ansprechpartner.filter({
                nachname: contact.nachname,
                vorname: contact.vorname,
              });
              if (!existing || existing.length === 0) {
                await base44.entities.Ansprechpartner.create({
                  vorname: contact.vorname || '',
                  nachname: contact.nachname || '',
                  email: contact.email || '',
                  telefon: contact.tel || '',
                  rolle: contact.titel || '',
                });
                newFromNas++;
              }
            }
          }
        } catch {}
      }

      return Response.json({
        success: true,
        total: contacts.length,
        appContacts: appContacts.length,
        externalContacts: externalContacts.length,
        updatedFirmen,
        updatedPersons,
        newFromNas,
      });
    }

    if (action === 'push_all') {
      const abUrl = await discoverAddressBook();
      if (!abUrl) {
        return Response.json({ success: false, error: 'CardDAV nicht gefunden.' }, { status: 500 });
      }

      const [firmen, persons] = await Promise.all([
        base44.entities.Firma.list('-name', 500),
        base44.entities.Ansprechpartner.list('-nachname', 500),
      ]);

      let pushedFirmen = 0;
      let pushedPersons = 0;
      let errors = 0;
      const errorDetails: string[] = [];

      const firmaMap = new Map(firmen.map(f => [f.id, f.name]));

      for (const firma of firmen) {
        try {
          const uid = `app-firma-${firma.id}`;
          const vcard = buildFirmaVCard(firma);
          await pushContact(abUrl, uid, vcard);
          pushedFirmen++;
        } catch (e: any) {
          errors++;
          if (errorDetails.length < 3) errorDetails.push(`Firma ${firma.name}: ${e.message}`);
        }
      }

      for (const person of persons) {
        try {
          const uid = `app-ansprechpartner-${person.id}`;
          const firmaName = person.firma_id ? firmaMap.get(person.firma_id) : '';
          const vcard = buildAnsprechpartnerVCard(person, firmaName);
          await pushContact(abUrl, uid, vcard);
          pushedPersons++;
        } catch (e: any) {
          errors++;
          if (errorDetails.length < 6) errorDetails.push(`Person ${person.vorname} ${person.nachname}: ${e.message}`);
        }
      }

      return Response.json({
        success: true,
        addressBookUrl: abUrl,
        pushedFirmen,
        pushedPersons,
        errors,
        total: pushedFirmen + pushedPersons,
        errorDetails,
      });
    }

    return Response.json({ success: false, error: `Unbekannte Aktion: ${action}` }, { status: 400 });

  } catch (e: any) {
    console.error('nasContacts error:', e);
    return Response.json({ success: false, error: e.message || 'Unbekannter Fehler' }, { status: 500 });
  }
});