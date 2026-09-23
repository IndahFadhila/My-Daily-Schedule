// Worker entrypoint: HTTP routes buat subscribe/unsubscribe/test,
// plus cron handler yang fire push notif tiap match jadwal.

import { SCHEDULES } from './schedule.js';
import { sendPush, b64urlDecode } from './webpush.js';

// ---------- helpers ----------
function corsHeaders(env) {
  return {
    'Access-Control-Allow-Origin': env.ALLOWED_ORIGIN,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
  };
}
function json(data, env, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(env) },
  });
}
async function hashEndpoint(endpoint) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(endpoint));
  const bytes = new Uint8Array(buf);
  let hex = '';
  for (let i = 0; i < bytes.length; i++) hex += bytes[i].toString(16).padStart(2, '0');
  return hex.slice(0, 32);
}

// ---------- routes ----------
async function handleSubscribe(request, env) {
  const sub = await request.json();
  if (!sub?.endpoint || !sub?.keys?.p256dh || !sub?.keys?.auth) {
    return json({ error: 'invalid subscription' }, env, 400);
  }
  const key = 'sub:' + await hashEndpoint(sub.endpoint);
  await env.SUBS.put(key, JSON.stringify({
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: Date.now(),
  }));
  return json({ ok: true, key }, env);
}

async function handleUnsubscribe(request, env) {
  const { endpoint } = await request.json();
  if (!endpoint) return json({ error: 'missing endpoint' }, env, 400);
  const key = 'sub:' + await hashEndpoint(endpoint);
  await env.SUBS.delete(key);
  return json({ ok: true }, env);
}

async function handleTest(request, env) {
  // Kirim test notif ke semua subscription (buat verify wiring)
  const results = await fireForActivity(env, {
    title: 'Test dari Cloudflare Worker',
    desc: 'Kalau ini muncul, push server jalan ✅',
    icon: '🧪',
  });
  return json({ ok: true, sent: results.length, results }, env);
}

async function listSubs(env) {
  const out = [];
  let cursor;
  do {
    const list = await env.SUBS.list({ prefix: 'sub:', cursor });
    for (const k of list.keys) {
      const raw = await env.SUBS.get(k.name);
      if (raw) out.push({ key: k.name, sub: JSON.parse(raw) });
    }
    cursor = list.cursor;
    if (list.list_complete) break;
  } while (cursor);
  return out;
}

async function fireForActivity(env, activity) {
  const subs = await listSubs(env);
  if (subs.length === 0) return [];
  if (!env.VAPID_JWK) {
    console.error('[push] VAPID_JWK secret belum di-set');
    return [{ error: 'VAPID_JWK secret not configured' }];
  }
  let jwk;
  try { jwk = JSON.parse(env.VAPID_JWK); }
  catch (e) { return [{ error: 'VAPID_JWK not valid JSON: ' + e.message }]; }
  const payload = {
    title: 'Waktunya ' + activity.title,
    body: activity.desc,
    icon: activity.icon,
    tag: 'jadwal-activity',
  };
  const results = [];
  for (const { key, sub } of subs) {
    try {
      const r = await sendPush(sub, payload, jwk, env.VAPID_PUBLIC_KEY, env.VAPID_SUBJECT);
      // 404/410 = subscription expired -> hapus
      if (r.status === 404 || r.status === 410) {
        await env.SUBS.delete(key);
      }
      results.push({ key, ok: r.ok, status: r.status, text: r.text });
    } catch (e) {
      results.push({ key, ok: false, error: String(e) });
    }
  }
  return results;
}

// ---------- HTTP handler ----------
export default {
  async fetch(request, env) {
    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders(env) });
    }
    const url = new URL(request.url);
    const path = url.pathname;

    if (path === '/vapid-public' && request.method === 'GET') {
      return json({ key: env.VAPID_PUBLIC_KEY }, env);
    }
    if (path === '/subscribe' && request.method === 'POST') {
      return handleSubscribe(request, env);
    }
    if (path === '/unsubscribe' && request.method === 'POST') {
      return handleUnsubscribe(request, env);
    }
    if (path === '/test' && request.method === 'POST') {
      return handleTest(request, env);
    }
    return json({ error: 'not found', path }, env, 404);
  },

  // Cron: tiap menit, cek jadwal (WIB) dan fire push kalau ada activity yang mulai
  async scheduled(event, env, ctx) {
    const tzOffset = parseInt(env.TZ_OFFSET_HOURS || '7', 10);
    const now = new Date(Date.now() + tzOffset * 3600 * 1000);
    // Pake getUTC* karena kita udah shift manual, jam-nya udah representasi WIB
    const dow = now.getUTCDay();  // 0=Sun, 6=Sat
    const hh = String(now.getUTCHours()).padStart(2, '0');
    const mm = String(now.getUTCMinutes()).padStart(2, '0');
    const nowHM = hh + ':' + mm;
    const schedKey = (dow === 0 || dow === 6) ? 'weekend' : 'weekday';
    const items = SCHEDULES[schedKey].items;
    const matches = items.filter(it => it.start === nowHM);
    if (matches.length === 0) return;

    for (const it of matches) {
      ctx.waitUntil(fireForActivity(env, it));
    }
  },
};
