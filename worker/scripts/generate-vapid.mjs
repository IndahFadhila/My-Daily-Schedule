// Generate VAPID keypair. Run: node scripts/generate-vapid.mjs
// Output:
//   1. VAPID_PUBLIC_KEY  -> paste ke wrangler.toml [vars]
//   2. VAPID_JWK (JSON)  -> set via `wrangler secret put VAPID_JWK`

import { webcrypto as crypto } from 'node:crypto';

const kp = await crypto.subtle.generateKey(
  { name: 'ECDSA', namedCurve: 'P-256' },
  true,
  ['sign', 'verify']
);

const jwk = await crypto.subtle.exportKey('jwk', kp.privateKey);
const rawPub = new Uint8Array(await crypto.subtle.exportKey('raw', kp.publicKey));
const b64url = (buf) => Buffer.from(buf).toString('base64url');

console.log('');
console.log('=== VAPID_PUBLIC_KEY (paste ke wrangler.toml [vars]) ===');
console.log(b64url(rawPub));
console.log('');
console.log('=== VAPID_JWK (nanti diminta pas `wrangler secret put VAPID_JWK`) ===');
console.log(JSON.stringify(jwk));
console.log('');
