import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { projectId, oldStatus, newStatus } = body || {};

    if (!projectId) return Response.json({ error: 'projectId required' }, { status: 400 });

    // Edge case: only fire on status change to Abgeschlossen
    // If oldStatus/newStatus provided, verify the transition
    if (oldStatus !== undefined && newStatus !== undefined) {
      if (newStatus !== 'Abgeschlossen' || oldStatus === 'Abgeschlossen') {
        return Response.json({ skipped: true, reason: 'No status transition to Abgeschlossen' });
      }
    }

    // Load the project
    const project = await base44.asServiceRole.entities.Projekt.get(projectId);
    if (!project) return Response.json({ error: 'Project not found' }, { status: 404 });

    // Verify status is Abgeschlossen
    if (project.status !== 'Abgeschlossen') {
      return Response.json({ skipped: true, reason: `Project status is ${project.status}, not Abgeschlossen` });
    }

    const projektart = project.projektart || 'Sonstige';

    // Load all phases for this project
    const phases = await base44.asServiceRole.entities.Projektphase.filter({ projekt_id: projectId });

    const results = [];

    for (const phase of phases) {
      // Load all time entries for this phase
      const zeiten = await base44.asServiceRole.entities.Zeiteintrag.filter({ phase_id: phase.id });
      
      // Edge case: skip phases without time entries
      if (!zeiten || zeiten.length === 0) {
        results.push({ phase: phase.phase, skipped: true, reason: 'No time entries' });
        continue;
      }

      const tatsaechlicheStunden = zeiten
        .filter(z => !z.timer_laeuft)
        .reduce((sum, z) => sum + (z.stunden || 0), 0);

      // Edge case: skip if actual hours are 0
      if (tatsaechlicheStunden === 0) {
        results.push({ phase: phase.phase, skipped: true, reason: 'Zero actual hours' });
        continue;
      }

      // Find existing Erfahrungswert for this phase + projektart
      const existing = await base44.asServiceRole.entities.Phasen_Erfahrungswerte.filter({
        phase: phase.phase,
        projektart: projektart
      });

      let erf = existing[0];
      const prevCount = erf?.anzahl_projekte || 0;
      const prevAvg = erf?.durchschnitt_stunden || 0;
      const prevMin = erf?.min_stunden || 0;
      const prevMax = erf?.max_stunden || 0;

      const newCount = prevCount + 1;

      // Weighted average: (prevAvg * prevCount + actual) / newCount
      const newAvg = (prevAvg * prevCount + tatsaechlicheStunden) / newCount;

      // New min/max
      const newMin = prevCount === 0 ? tatsaechlicheStunden : Math.min(prevMin, tatsaechlicheStunden);
      const newMax = prevCount === 0 ? tatsaechlicheStunden : Math.max(prevMax, tatsaechlicheStunden);

      // Trust score
      let vertrauensScore;
      if (newCount <= 2) vertrauensScore = 0.3;
      else if (newCount <= 5) vertrauensScore = 0.6;
      else if (newCount <= 10) vertrauensScore = 0.85;
      else vertrauensScore = 1.0;

      // Abweichung (for logging only)
      const geschaetzt = phase.stunden_geschaetzt || 0;
      const abweichung = geschaetzt > 0 ? ((tatsaechlicheStunden - geschaetzt) / geschaetzt) * 100 : null;

      const updateData = {
        durchschnitt_stunden: Math.round(newAvg * 100) / 100,
        min_stunden: Math.round(newMin * 100) / 100,
        max_stunden: Math.round(newMax * 100) / 100,
        anzahl_projekte: newCount,
        vertrauens_score: vertrauensScore
      };

      if (erf) {
        await base44.asServiceRole.entities.Phasen_Erfahrungswerte.update(erf.id, updateData);
      } else {
        await base44.asServiceRole.entities.Phasen_Erfahrungswerte.create({
          phase: phase.phase,
          projektart: projektart,
          ...updateData
        });
      }

      results.push({
        phase: phase.phase,
        projektart,
        tatsaechlicheStunden: Math.round(tatsaechlicheStunden * 100) / 100,
        geschaetzt,
        abweichung: abweichung !== null ? Math.round(abweichung * 100) / 100 : null,
        newCount,
        vertrauensScore
      });
    }

    return Response.json({ success: true, projectId, projektart, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});