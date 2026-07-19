import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    let body;
    try { body = await req.json(); } catch { body = {}; }
    const { subject, start_datetime, end_datetime, body: eventBody, location, is_all_day, projekt_id, aufgabe_id, kalender_event_id } = body || {};

    if (!subject || !start_datetime || !end_datetime) {
      return Response.json({ error: 'subject, start_datetime, end_datetime required' }, { status: 400 });
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

    const response = await fetch('https://graph.microsoft.com/v1.0/me/events', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(graphEvent)
    });

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Graph API error: ${response.status} ${errorText}` }, { status: 502 });
    }

    const createdEvent = await response.json();

    if (kalender_event_id) {
      await base44.asServiceRole.entities.KalenderEvent.update(kalender_event_id, {
        outlook_id: createdEvent.id,
        outlook_change_key: createdEvent.changeKey,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString()
      });
    } else {
      const newEvent = await base44.asServiceRole.entities.KalenderEvent.create({
        outlook_id: createdEvent.id,
        subject,
        body_preview: eventBody ? eventBody.substring(0, 200) : '',
        start_datetime,
        end_datetime,
        is_all_day: is_all_day || false,
        location: location || '',
        source: 'app',
        projekt_id: projekt_id || null,
        aufgabe_id: aufgabe_id || null,
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        outlook_change_key: createdEvent.changeKey || ''
      });
      return Response.json({ success: true, outlook_event_id: createdEvent.id, kalender_event_id: newEvent.id });
    }

    return Response.json({ success: true, outlook_event_id: createdEvent.id });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});