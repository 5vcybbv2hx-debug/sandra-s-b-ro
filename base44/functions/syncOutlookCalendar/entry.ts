import { createClientFromRequest } from 'npm:@base44/sdk@0.8.38';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);

    // Get Outlook connection (shared connector)
    const { accessToken } = await base44.asServiceRole.connectors.getConnection('outlook');
    if (!accessToken) {
      return Response.json({ error: 'Outlook connector not authorized' }, { status: 401 });
    }

    // Time window: today - 30 days to today + 90 days
    const now = new Date();
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    const to = new Date(now);
    to.setDate(to.getDate() + 90);

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${encodeURIComponent(from.toISOString())}&endDateTime=${encodeURIComponent(to.toISOString())}&$select=id,subject,bodyPreview,start,end,isAllDay,location,attendees,changeKey&$top=200`,
      { headers: { 'Authorization': `Bearer ${accessToken}`, 'Content-Type': 'application/json' } }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return Response.json({ error: `Graph API error: ${response.status} ${errorText}` }, { status: 502 });
    }

    const data = await response.json();
    const outlookEvents = data.value || [];

    // Load existing Outlook-sourced events
    const existingEvents = await base44.asServiceRole.entities.KalenderEvent.filter({ source: 'outlook' });
    const existingMap = new Map();
    for (const evt of existingEvents) {
      if (evt.outlook_id) existingMap.set(evt.outlook_id, evt);
    }

    const outlookIds = new Set();
    let created = 0, updated = 0;

    for (const outlookEvent of outlookEvents) {
      outlookIds.add(outlookEvent.id);
      const existing = existingMap.get(outlookEvent.id);

      const eventData = {
        outlook_id: outlookEvent.id,
        subject: outlookEvent.subject || '(kein Titel)',
        body_preview: outlookEvent.bodyPreview || '',
        start_datetime: outlookEvent.start?.dateTime || null,
        end_datetime: outlookEvent.end?.dateTime || null,
        is_all_day: outlookEvent.isAllDay || false,
        location: outlookEvent.location?.displayName || '',
        attendees: (outlookEvent.attendees || []).map(a => a.emailAddress?.address).filter(Boolean),
        source: 'outlook',
        sync_status: 'synced',
        last_synced_at: new Date().toISOString(),
        outlook_change_key: outlookEvent.changeKey || ''
      };

      if (existing) {
        if (existing.outlook_change_key !== outlookEvent.changeKey) {
          await base44.asServiceRole.entities.KalenderEvent.update(existing.id, eventData);
          updated++;
        }
      } else {
        await base44.asServiceRole.entities.KalenderEvent.create(eventData);
        created++;
      }
    }

    // Mark events deleted in Outlook
    let deleted = 0;
    for (const [outlookId, existing] of existingMap) {
      if (!outlookIds.has(outlookId)) {
        await base44.asServiceRole.entities.KalenderEvent.update(existing.id, { sync_status: 'deleted_outlook' });
        deleted++;
      }
    }

    return Response.json({ success: true, total: outlookEvents.length, created, updated, deleted });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});