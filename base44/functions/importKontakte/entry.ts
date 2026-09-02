import { createClientFromRequest } from "@base44/sdk/server";

export default async function(req: any, res: any) {
  try {
    const base44 = createClientFromRequest(req);
    
    const { firms = [], contacts = [], standalone = [] } = req.body;
    
    const results = {
      firms_created: 0,
      contacts_created: 0,
      standalone_created: 0,
      errors: [] as string[],
      firm_id_map: {} as Record<string, string>,
    };
    
    // Step 1: Create Firma records
    for (const f of firms) {
      try {
        const created = await base44.entities.Firma.create({
          name: f.name,
          branche: f.branche || 'Sonstiges',
          adresse: f.adresse || '',
          telefon_zentrale: f.telefon_zentrale || '',
          email_allgemein: f.email_allgemein || '',
          aktiv: true,
        });
        results.firm_id_map[f.name] = created.id;
        results.firms_created++;
      } catch (e: any) {
        results.errors.push(`Firma ${f.name}: ${e.message}`);
      }
    }
    
    // Step 2: Create Ansprechpartner linked to Firma
    for (const c of contacts) {
      try {
        const firmaId = results.firm_id_map[c.firma_name];
        if (!firmaId) {
          results.errors.push(`Contact ${c.vorname} ${c.nachname}: Firma "${c.firma_name}" not found`);
          continue;
        }
        
        await base44.entities.Ansprechpartner.create({
          vorname: c.vorname,
          nachname: c.nachname,
          firma_id: firmaId,
          rolle: c.rolle || 'Sonstiges',
          telefon: c.telefon || '',
          email: c.email || '',
        });
        results.contacts_created++;
      } catch (e: any) {
        results.errors.push(`Contact ${c.vorname} ${c.nachname}: ${e.message}`);
      }
    }
    
    // Step 3: Create standalone persons as Ansprechpartner with "Privatperson" Firma
    let privatFirmaId = '';
    try {
      const existing = await base44.entities.Firma.filter({ name: 'Privatperson' });
      if (existing && existing.length > 0) {
        privatFirmaId = existing[0].id;
      } else {
        const created = await base44.entities.Firma.create({
          name: 'Privatperson',
          branche: 'Privatperson',
          aktiv: true,
        });
        privatFirmaId = created.id;
      }
    } catch (e: any) {
      results.errors.push(`Privatperson Firma: ${e.message}`);
    }
    
    for (const p of standalone) {
      try {
        await base44.entities.Ansprechpartner.create({
          vorname: p.vorname,
          nachname: p.nachname,
          firma_id: privatFirmaId || '',
          rolle: 'Bauherr',
          telefon: p.telefon || '',
          email: p.email || '',
          notizen: p.adresse || '',
        });
        results.standalone_created++;
      } catch (e: any) {
        results.errors.push(`Standalone ${p.vorname} ${p.nachname}: ${e.message}`);
      }
    }
    
    res.json({
      success: true,
      ...results,
      total: results.firms_created + results.contacts_created + results.standalone_created,
    });
  } catch (e: any) {
    res.status(500).json({ error: e.message });
  }
}
