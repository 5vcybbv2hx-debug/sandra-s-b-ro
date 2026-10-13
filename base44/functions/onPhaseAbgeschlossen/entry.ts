import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { phaseId } = body || {};

    if (!phaseId) return Response.json({ error: 'phaseId required' }, { status: 400 });

    // Load the phase
    const phase = await base44.asServiceRole.entities.Projektphase.get(phaseId);
    if (!phase) return Response.json({ error: 'Phase not found' }, { status: 404 });

    // Load the project
    const project = await base44.asServiceRole.entities.Projekt.get(phase.projekt_id);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    const projektart = project.projektart || 'Sonstiges';
    const phaseName = phase.phase;

    // 1. Sum time entries for this phase and update stunden_erfasst
    const zeiten = await base44.asServiceRole.entities.Zeiteintrag.filter({ phase_id: phaseId });
    const summe = zeiten.filter((z) => !z.timer_laeuft).reduce((s, z) => s + (z.stunden || 0), 0);

    if (summe > 0 && Math.abs((phase.stunden_erfasst || 0) - summe) > 0.01) {
      await base44.asServiceRole.entities.Projektphase.update(phaseId, { stunden_erfasst: Math.round(summe * 100) / 100 });
    }

    // 2. Load all completed phases with the same phase name
    const allCompleted = await base44.asServiceRole.entities.Projektphase.filter({
      phase: phaseName,
      status: 'Abgeschlossen'
    });

    // Get unique project IDs and load projects
    const projectIds = [...new Set(allCompleted.map((p) => p.projekt_id))];
    const projects = projectIds.length > 0
      ? await base44.asServiceRole.entities.Projekt.filter({ id: { $in: projectIds } })
      : [];
    const projectArtMap = new Map(projects.map((p) => [p.id, p.projektart || 'Sonstiges']));

    // Filter to matching projektart, collect one value per project
    const projectValues = new Map();

    for (const ph of allCompleted) {
      const pa = projectArtMap.get(ph.projekt_id);
      if (pa !== projektart) continue;

      let val = ph.stunden_erfasst || 0;
      if (val === 0) {
        // Fallback: compute from time entries for older phases without stunden_erfasst
        const z = await base44.asServiceRole.entities.Zeiteintrag.filter({ phase_id: ph.id });
        val = z.filter((x) => !x.timer_laeuft).reduce((s, x) => s + (x.stunden || 0), 0);
      }
      if (val > 0) {
        projectValues.set(ph.projekt_id, val);
      }
    }

    const values = [...projectValues.values()];
    const count = values.length;

    if (count === 0) {
      return Response.json({ success: true, phaseId, phaseName, projektart, reason: 'No valid data' });
    }

    const avg = values.reduce((s, v) => s + v, 0) / count;
    const min = Math.min(...values);
    const max = Math.max(...values);
    const vertrauensScore = Math.min(1, count / 5);

    // 3. Create or update Erfahrungswerte
    const existing = await base44.asServiceRole.entities.Phasen_Erfahrungswerte.filter({
      phase: phaseName,
      projektart
    });

    const data = {
      durchschnitt_stunden: Math.round(avg * 100) / 100,
      min_stunden: Math.round(min * 100) / 100,
      max_stunden: Math.round(max * 100) / 100,
      anzahl_projekte: count,
      vertrauens_score: Math.round(vertrauensScore * 100) / 100
    };

    if (existing.length > 0) {
      await base44.asServiceRole.entities.Phasen_Erfahrungswerte.update(existing[0].id, data);
    } else {
      await base44.asServiceRole.entities.Phasen_Erfahrungswerte.create({ phase: phaseName, projektart, ...data });
    }

    return Response.json({
      success: true,
      phaseId,
      phaseName,
      projektart,
      stunden_erfasst: Math.round(summe * 100) / 100,
      erfahrungswerte: data
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});