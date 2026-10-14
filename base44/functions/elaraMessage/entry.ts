import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { waitUntil } from 'base44:runtime';

const AGENT_ID = '6a6dd4806b39408bc6ba692f';
const API_BASE = 'https://app.base44.com/api/agents';
const API_KEY = '87b3ea5e27454880af3ea82c048fb19b';

// Hook-URL für WhatsApp-Benachrichtigung bei Änderungswünschen.
// Primär: base44.app; Fallback: app.base44.com
const HOOK_URL = 'https://base44.app/api/apps/6a6dd4806b39408bc6ba692f/functions/sandraNachrichtHook';
const HOOK_URL_FALLBACK = 'https://app.base44.com/api/apps/6a6dd4806b39408bc6ba692f/functions/sandraNachrichtHook';

const PREFIX = '[Sandra Büro — antworte der Nutzerin kurz und effizient: max. 3-4 Sätze, nur konkrete Schritte, keine langen Aufzählungen] ';

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const message = body?.message;
    if (!message || typeof message !== 'string') {
      return Response.json({ error: 'Message required' }, { status: 400 });
    }

    // Async hook: Roh-Nachricht weiterleiten (feuervergessen, blockiert nicht)
    const senderName = user.full_name || user.email || 'Unbekannt';
    waitUntil(
      (async () => {
        const hookBody = JSON.stringify({ message, sender_name: senderName });
        for (const url of [HOOK_URL, HOOK_URL_FALLBACK]) {
          try {
            const res = await fetch(url, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: hookBody,
              signal: AbortSignal.timeout(10000)
            });
            if (res.ok) return;
          } catch {}
        }
      })()
    );

    const headers = {
      'Content-Type': 'application/json',
      'api_key': API_KEY
    };

    // 1. Create conversation
    const convRes = await fetch(`${API_BASE}/${AGENT_ID}/conversations`, {
      method: 'POST',
      headers,
      body: '{}',
      signal: AbortSignal.timeout(15000)
    });
    if (!convRes.ok) throw new Error('Conversation creation failed: ' + convRes.status);
    const conv = await convRes.json();
    const convId = conv.id || conv._id || conv.conversation_id || conv.data?.id;
    if (!convId) throw new Error('No conversation ID returned');

    // 2. Send message and wait for reply
    const msgRes = await fetch(`${API_BASE}/${AGENT_ID}/conversations/${convId}/messages`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ content: `${PREFIX}${message}` }),
      signal: AbortSignal.timeout(120000)
    });
    if (!msgRes.ok) throw new Error('Message send failed: ' + msgRes.status);
    const msgData = await msgRes.json();

    // Extract reply text from various possible response shapes
    let reply = '';
    if (Array.isArray(msgData)) {
      const last = [...msgData].reverse().find((m: any) => m.role === 'assistant' || m.role === 'agent');
      reply = last?.content || last?.text || '';
    } else if (msgData && typeof msgData === 'object') {
      reply = msgData.content || msgData.text || msgData.reply ||
              msgData.message?.content || msgData.data?.content || '';
    }
    if (!reply) reply = 'Elara hat keine Antwort gesendet.';

    return Response.json({ reply });
  } catch (error) {
    return Response.json({
      reply: 'Elara ist gerade nicht erreichbar — bitte später nochmal versuchen.',
      error: true
    });
  }
}