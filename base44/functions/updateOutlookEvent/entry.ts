import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { kalender_event_id, subject, start_datetime, end_datetime, body: eventBody, location, is_all_day } = body || {};

    if (!kalender_event_id) {
      return Response.json({ error: 'kalender_event_id required' }, { status: 400 });
    }

    const event = await base44.asServiceRole.entities.KalenderEvent.get(kalender_event_id);
    if (!event || !event.outlook_id) {
      return Response.json({ error: 'Kein Outlook-Termin für dieses KalenderEvent gefunden' }, { status: 404 });
    }

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
    if (!accessToken) {
      return Response.json({ error: 'Outlook connector not authorized' }, { status: 401 });
    }

    const graphEvent = {
      subject,
      body: { contentType: 'text', content: eventBody || '' },
      start: { dateTime: start_datetime, timeZone: 'Europe/Berlin' },
      end: { dateTime: end_datetime, timeZone: 'Europe/Berlin' },
      location: location ? { displayName: location } : null,
      isAllDay: is_all_day || false
    };

    const response = await fetch(`https://graph.microsoft.com/v1.0/me/events/${event.outlook_id}`, {
      method: 'PATCH',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(graphEvent)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Graph API error: ${response.status} ${errorText}` }, { status: 502 });
    }

    const updated = await response.json();

    await base44.asServiceRole.entities.KalenderEvent.update(kalender_event_id, {
      subject,
      start_datetime,
      end_datetime,
      is_all_day: is_all_day || false,
      location: location || '',
      outlook_change_key: updated.changeKey || '',
      sync_status: 'synced',
      last_synced_at: new Date().toISOString()
    });

    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});