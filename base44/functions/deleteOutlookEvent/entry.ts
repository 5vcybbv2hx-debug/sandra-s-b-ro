import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { kalender_event_id } = body || {};

    if (!kalender_event_id) {
      return Response.json({ error: 'kalender_event_id required' }, { status: 400 });
    }

    const event = await base44.asServiceRole.entities.KalenderEvent.get(kalender_event_id);
    if (!event || !event.outlook_id) {
      return Response.json({ error: 'Kein Outlook-Termin gefunden' }, { status: 404 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
    if (!accessToken) {
      return Response.json({ error: 'Outlook connector not authorized' }, { status: 401 });
    }

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${event.outlook_id}`, {
      method: 'DELETE',
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });

    if (!response.ok && response.status !== 404) {
      const errorText = await response.text();
      return Response.json({ error: `Graph API error: ${response.status} ${errorText}` }, { status: 502 });
    }

    await base44.asServiceRole.entities.KalenderEvent.delete(kalender_event_id);

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});