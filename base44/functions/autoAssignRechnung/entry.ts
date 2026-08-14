import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);

    let body: any;
    try {
      body = await req.json();
    } catch (err) {
      return Response.json({ success: false, error: 'Ungueltiges JSON im Request-Body.' }, { status: 400 });
    }

    const { rechnung_id } = body || {};
    if (!rechnung_id) {
      return Response.json({ success: false, error: 'rechnung_id fehlt.' }, { status: 400 });
    }

    // RechnungsMatch laden (service role, da Workflow ohne User-Kontext aufruft)
    let rechnung: any;
    try {
      rechnung = await base44.asServiceRole.entities.RechnungsMatch.get(rechnung_id);
    } catch (err) {
      return Response.json({ success: false, error: 'RechnungsMatch nicht gefunden.' }, { status: 404 });
    }
    if (!rechnung) {
      return Response.json({ success: false, error: 'RechnungsMatch nicht gefunden.' }, { status: 404 });
    }

    // Nur bei "Zugeordnet" mit verknüpftem Projekt aktualisieren
    if (rechnung.status !== 'Zugeordnet' || !rechnung.linked_project) {
      return Response.json({ success: true, skipped: true, reason: 'status_not_zugeordnet_or_no_project' });
    }

    const projectId = rechnung.linked_project;

    // Projekt laden
    let projekt: any;
    try {
      projekt = await base44.asServiceRole.entities.Projekt.get(projectId);
    } catch (err) {
      return Response.json({ success: false, error: 'Verknüpftes Projekt nicht gefunden.' }, { status: 404 });
    }
    if (!projekt) {
      return Response.json({ success: false, error: 'Verknüpftes Projekt nicht gefunden.' }, { status: 404 });
    }

    // Alle zugeordneten Rechnungen für dieses Projekt summieren
    const allRechnungen: any[] = await base44.asServiceRole.entities.RechnungsMatch.filter({
      linked_project: projectId,
      status: 'Zugeordnet'
    });

    const gesamtBetrag = allRechnungen.reduce((sum, r) => sum + (Number(r.betrag) || 0), 0);
    const gesamtStunden = allRechnungen.reduce((sum, r) => sum + (Number(r.stunden) || 0), 0);
    const stundensatz = gesamtStunden > 0 ? Math.round((gesamtBetrag / gesamtStunden) * 100) / 100 : 0;

    // Projekt aktualisieren
    await base44.asServiceRole.entities.Projekt.update(projectId, {
      ist_abgerechnet: true,
      pauschalbetrag: Math.round(gesamtBetrag * 100) / 100,
      abrechnete_stunden: Math.round(gesamtStunden * 100) / 100,
      stundensatz: stundensatz
    });

    return Response.json({
      success: true,
      projekt_id: projectId,
      gesamt_betrag: gesamtBetrag,
      gesamt_stunden: gesamtStunden,
      stundensatz: stundensatz,
      anzahl_rechnungen: allRechnungen.length
    });
  } catch (error: any) {
    return Response.json({ success: false, error: error?.message || String(error) }, { status: 500 });
  }
}