import { createClientFromRequest } from 'npm:@base44/sdk@0.8.40';

const DRIVE_TOKEN = 'sandra-drive-2026';

function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}&zoom=18&addressdetails=1`;
    const res = await fetch(url, { headers: { 'User-Agent': 'sandra-buero-fahrtenbuch' } });
    if (!res.ok) return null;
    const data = await res.json();
    return data.display_name || null;
  } catch {
    return null;
  }
}

function todayDate() {
  return new Date().toISOString().slice(0, 10);
}

function nowTime() {
  return new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

export default async function (req) {
  try {
    // Token auth via X-Drive-Token header
    const token = req.headers.get('X-Drive-Token');
    if (token !== DRIVE_TOKEN) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { action, lat, lon } = body;

    if (!action || lat == null || lon == null) {
      return Response.json({ error: 'Missing action or coordinates' }, { status: 400 });
    }

    const latitude = Number(lat);
    const longitude = Number(lon);
    if (isNaN(latitude) || isNaN(longitude)) {
      return Response.json({ error: 'Invalid coordinates' }, { status: 400 });
    }

    const gpsString = `${latitude.toFixed(6)},${longitude.toFixed(6)}`;

    if (action === 'start') {
      const startort = (await reverseGeocode(latitude, longitude)) || 'GPS erfasst';
      const fahrt = await base44.asServiceRole.entities.Fahrt.create({
        datum: todayDate(),
        startort,
        zielort: '',
        zweck: '',
        kilometer: 0,
        uhrzeit_start: nowTime(),
        uhrzeit_ende: '',
        gps_start: gpsString,
        status: 'offen',
      });
      return Response.json({ ok: true, fahrt_id: fahrt.id, startort });
    }

    if (action === 'end') {
      // Find most recent open Fahrt
      const open = await base44.asServiceRole.entities.Fahrt.filter({ status: 'offen' }, '-created_date', 1);

      if (!open || open.length === 0) {
        // No open drive — create a completed one with just the end point
        const zielort = (await reverseGeocode(latitude, longitude)) || 'GPS erfasst';
        const fahrt = await base44.asServiceRole.entities.Fahrt.create({
          datum: todayDate(),
          startort: 'Unbekannt',
          zielort,
          zweck: '',
          kilometer: 0,
          uhrzeit_start: '',
          uhrzeit_ende: nowTime(),
          gps_end: gpsString,
          status: 'abgeschlossen',
        });
        return Response.json({ ok: true, fahrt_id: fahrt.id, zielort, warning: 'No open drive found' });
      }

      const current = open[0];
      const zielort = (await reverseGeocode(latitude, longitude)) || 'GPS erfasst';

      let kilometer = 0;
      if (current.gps_start) {
        const parts = current.gps_start.split(',').map(Number);
        const sLat = parts[0];
        const sLon = parts[1];
        if (!isNaN(sLat) && !isNaN(sLon)) {
          kilometer = Math.round(haversineKm(sLat, sLon, latitude, longitude) * 10) / 10;
        }
      }

      await base44.asServiceRole.entities.Fahrt.update(current.id, {
        zielort,
        gps_end: gpsString,
        kilometer,
        uhrzeit_ende: nowTime(),
        status: 'abgeschlossen',
      });

      return Response.json({ ok: true, fahrt_id: current.id, zielort, kilometer });
    }

    return Response.json({ error: 'Unknown action. Use "start" or "end".' }, { status: 400 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}