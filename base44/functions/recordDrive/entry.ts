import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

const DRIVE_TOKEN = Deno.env.get("DRIVE_TOKEN") || "sandra-drive-2026";

function haversine(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

async function reverseGeocode(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&zoom=14&accept-language=de`;
    const resp = await fetch(url, {
      headers: { "User-Agent": "SandraBuroDriveTracker/1.0" }
    });
    const data = await resp.json();
    return data.display_name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  } catch {
    return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
  }
}

function formatTime() {
  return new Date().toTimeString().slice(0, 5);
}

function todayDate() {
  return new Date().toISOString().split("T")[0];
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type, X-Drive-Token",
        "Access-Control-Allow-Methods": "POST, OPTIONS"
      }
    });
  }

  try {
    const token = req.headers.get("X-Drive-Token");
    if (token !== DRIVE_TOKEN) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    const base44 = createClientFromRequest(req);
    const body = await req.json();

    if (body.action === "start") {
      const { lat, lng } = body;
      if (lat == null || lng == null) {
        return new Response(JSON.stringify({ error: "lat and lng required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const startort = await reverseGeocode(lat, lng);
      const fahrt = await base44.asServiceRole.entities.Fahrt.create({
        datum: todayDate(),
        startort: startort,
        zielort: "",
        kilometer: 0,
        zweck: "",
        uhrzeit_start: formatTime(),
        uhrzeit_ende: "",
        status: "offen",
        gps_start: `${lat.toFixed(5)},${lng.toFixed(5)}`
      });

      return new Response(JSON.stringify({
        ok: true,
        drive_id: fahrt.id,
        startort: startort,
        uhrzeit_start: formatTime()
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (body.action === "end") {
      const { lat, lng, drive_id } = body;
      if (lat == null || lng == null || !drive_id) {
        return new Response(JSON.stringify({ error: "lat, lng and drive_id required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const fahrt = await base44.asServiceRole.entities.Fahrt.get(drive_id);
      if (!fahrt) {
        return new Response(JSON.stringify({ error: "Fahrt nicht gefunden" }), {
          status: 404,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const zielort = await reverseGeocode(lat, lng);
      let km = 0;
      const startGps = fahrt.gps_start;
      if (startGps) {
        const [lat1, lng1] = startGps.split(",").map(Number);
        km = Math.round(haversine(lat1, lng1, lat, lng) * 1.3 * 10) / 10;
      }

      await base44.asServiceRole.entities.Fahrt.update(drive_id, {
        zielort: zielort,
        uhrzeit_ende: formatTime(),
        kilometer: km,
        status: "abgeschlossen",
        gps_end: `${lat.toFixed(5)},${lng.toFixed(5)}`
      });

      return new Response(JSON.stringify({
        ok: true,
        drive_id: drive_id,
        zielort: zielort,
        uhrzeit_ende: formatTime(),
        kilometer: km
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    if (body.action === "complete") {
      const { drive_id, zweck, projekt_id } = body;
      if (!drive_id) {
        return new Response(JSON.stringify({ error: "drive_id required" }), {
          status: 400,
          headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
        });
      }

      const update = {};
      if (zweck) update.zweck = zweck;
      if (projekt_id) update.projekt_id = projekt_id;
      await base44.asServiceRole.entities.Fahrt.update(drive_id, update);

      return new Response(JSON.stringify({
        ok: true,
        drive_id: drive_id
      }), {
        status: 200,
        headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
      });
    }

    return new Response(JSON.stringify({ error: "Unknown action" }), {
      status: 400,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message || "Server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
    });
  }
});
