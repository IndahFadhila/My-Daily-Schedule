// Web Push implementation buat Cloudflare Workers.
// Pake Web Crypto API (bukan Node crypto), jadi jalan di edge runtime.
// RFC 8291 (aes128gcm content encoding) + RFC 8292 (VAPID).

const enc = new TextEncoder();

// ---------- base64url helpers ----------
export function b64urlEncode(buf) {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let str = '';
  for (let i = 0; i < bytes.length; i++) str += String.fromCharCode(bytes[i]);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function b64urlDecode(str) {
  const s = str.replace(/-/g, '+').replace(/_/g, '/');
  const pad = s.length % 4 ? 4 - (s.length % 4) : 0;
  const bin = atob(s + '='.repeat(pad));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...arrs) {
  const total = arrs.reduce((n, a) => n + a.length, 0);
  const out = new Uint8Array(total);
  let off = 0;
  for (const a of arrs) { out.set(a, off); off += a.length; }
  return out;
}

// ---------- HMAC + HKDF (manual, karena SubtleCrypto HKDF gak expose PRK) ----------
async function hmacSha256(keyBytes, data) {
  const key = await crypto.subtle.importKey(
    'raw', keyBytes, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']
  );
  return new Uint8Array(await crypto.subtle.sign('HMAC', key, data));
}
async function hkdfExtract(salt, ikm) {
  return hmacSha256(salt, ikm);
}
async function hkdfExpand(prk, info, length) {
  const N = Math.ceil(length / 32);
  let T = new Uint8Array(0);
  const out = new Uint8Array(N * 32);
  for (let i = 1; i <= N; i++) {
    const data = concat(T, info, new Uint8Array([i]));
    T = await hmacSha256(prk, data);
    out.set(T, (i - 1) * 32);
  }
  return out.slice(0, length);
}

// ---------- VAPID JWT (ES256) ----------
export async function signVapidJwt(audience, subject, jwk) {
  const header = { alg: 'ES256', typ: 'JWT' };
  const payload = {
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 3600,
    sub: subject,
  };
  const h = b64urlEncode(enc.encode(JSON.stringify(header)));
  const p = b64urlEncode(enc.encode(JSON.stringify(payload)));
  const signingInput = enc.encode(h + '.' + p);
  const key = await crypto.subtle.importKey(
    'jwk', jwk, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  );
  const sig = new Uint8Array(await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, key, signingInput
  ));
  // Web Crypto returns raw (r||s, 64 bytes) — this IS JOSE format
  return h + '.' + p + '.' + b64urlEncode(sig);
}

// ---------- Payload encryption (aes128gcm per RFC 8291) ----------
async function encryptPayload(payload, uaPublicRaw, authSecret) {
  // 1. Ephemeral ECDH keypair
  const as = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']
  );
  const asPublicRaw = new Uint8Array(await crypto.subtle.exportKey('raw', as.publicKey));

  // 2. Import UA public key + derive shared secret
  const uaPublic = await crypto.subtle.importKey(
    'raw', uaPublicRaw, { name: 'ECDH', namedCurve: 'P-256' }, false, []
  );
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits(
    { name: 'ECDH', public: uaPublic }, as.privateKey, 256
  ));

  // 3. IKM = HKDF(auth, ecdh, "WebPush: info\0" || ua_public || as_public, 32)
  const keyInfo = concat(
    enc.encode('WebPush: info\0'),
    uaPublicRaw,
    asPublicRaw
  );
  const authPrk = await hkdfExtract(authSecret, ecdhSecret);
  const ikm = await hkdfExpand(authPrk, keyInfo, 32);

  // 4. Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // 5. PRK = HKDF-Extract(salt, IKM); CEK + NONCE via HKDF-Expand
  const prk = await hkdfExtract(salt, ikm);
  const cek = await hkdfExpand(prk, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdfExpand(prk, enc.encode('Content-Encoding: nonce\0'), 12);

  // 6. Encrypt: plaintext || 0x02 (last-record delimiter)
  const plaintext = concat(payload, new Uint8Array([0x02]));
  const aesKey = await crypto.subtle.importKey(
    'raw', cek, { name: 'AES-GCM' }, false, ['encrypt']
  );
  const ciphertext = new Uint8Array(await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: nonce }, aesKey, plaintext
  ));

  // 7. Header: salt (16) || rs (4 BE) || idlen (1) || keyid (65 = as_public raw)
  const rs = new Uint8Array(4);
  new DataView(rs.buffer).setUint32(0, 4096, false);
  const header = concat(salt, rs, new Uint8Array([asPublicRaw.length]), asPublicRaw);

  return concat(header, ciphertext);
}

// ---------- Kirim satu push notification ----------
export async function sendPush(subscription, payloadObj, vapidJwk, vapidPublicKey, vapidSubject) {
  const endpoint = subscription.endpoint;
  const url = new URL(endpoint);
  const audience = url.origin;

  const jwt = await signVapidJwt(audience, vapidSubject, vapidJwk);

  const payload = enc.encode(JSON.stringify(payloadObj));
  const uaPublic = b64urlDecode(subscription.keys.p256dh);
  const auth = b64urlDecode(subscription.keys.auth);
  const body = await encryptPayload(payload, uaPublic, auth);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Authorization': `vapid t=${jwt},k=${vapidPublicKey}`,
      'Content-Encoding': 'aes128gcm',
      'Content-Type': 'application/octet-stream',
      'TTL': '86400',
    },
    body,
  });

  return { ok: res.ok, status: res.status, text: res.ok ? '' : await res.text() };
}
