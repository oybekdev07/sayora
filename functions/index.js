const crypto = require('node:crypto');
const { initializeApp } = require('firebase-admin/app');
const { getDatabase } = require('firebase-admin/database');
const { defineSecret } = require('firebase-functions/params');
const { onRequest } = require('firebase-functions/v2/https');

initializeApp();
const db = getDatabase();
const adminPassword = defineSecret('ADMIN_PASSWORD');
const ALLOWED_ITEMS = new Set([
  'gold', 'x2', 'long', 'cc', 'ad', 'starter',
  'b_farm', 'b_zavod', 'b_bank', 'b_car', 'b_house'
]);
const USER_RE = /^[a-z0-9._]{1,30}$/;
const MAX_NAMES = 5000;

function send(res, status, body) {
  res.status(status).set('Content-Type', 'application/json').json(body);
}

function normalizeName(value) {
  if (typeof value !== 'string') return '';
  const name = value.trim().toLowerCase().replace(/^@/, '');
  return USER_RE.test(name) ? name : '';
}

function secureEqual(a, b) {
  const aa = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return aa.length === bb.length && crypto.timingSafeEqual(aa, bb);
}

async function getAllowList() {
  const value = (await db.ref('allow').get()).val();
  return Array.isArray(value) ? value.filter(x => typeof x === 'string') : [];
}

function cors(req, res) {
  const origin = req.get('origin');
  const configured = (process.env.ALLOWED_ORIGINS || '').split(',').map(x => x.trim()).filter(Boolean);
  if (origin && (!configured.length || configured.includes(origin))) {
    res.set('Access-Control-Allow-Origin', configured.length ? origin : '*');
    res.set('Vary', 'Origin');
  }
  res.set('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.set('Access-Control-Allow-Headers', 'Content-Type');
  res.set('Access-Control-Max-Age', '3600');
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return true;
  }
  if (origin && configured.length && !configured.includes(origin)) {
    send(res, 403, { status: 'error', error: 'origin_not_allowed' });
    return true;
  }
  return false;
}

exports.api = onRequest({
  region: 'us-central1',
  secrets: [adminPassword],
  timeoutSeconds: 30,
  memory: '256MiB'
}, async (req, res) => {
  if (cors(req, res)) return;
  if (req.method !== 'POST') return send(res, 405, { status: 'error', error: 'method_not_allowed' });

  const path = (req.path || '/').replace(/\/+$/, '') || '/';
  const body = req.body && typeof req.body === 'object' ? req.body : {};

  try {
    if (path === '/join') {
      const name = normalizeName(body.user);
      if (!name) return send(res, 400, { status: 'error', error: 'invalid_username' });
      const allow = await getAllowList();
      if (allow.includes(name)) return send(res, 200, { status: 'ok' });
      const auto = (await db.ref('config/autoApprove').get()).val() === true;
      if (auto) {
        await db.ref('allow').transaction(current => {
          const list = Array.isArray(current) ? current : [];
          return list.includes(name) ? list : [...list, name];
        });
        return send(res, 200, { status: 'ok' });
      }
      await db.ref(`pending/${name.replace(/\./g, ',')}`).set({ name, createdAt: Date.now() });
      return send(res, 200, { status: 'wait' });
    }

    if (path === '/adm') {
      const supplied = req.get('x-admin-password') || body.pass || '';
      if (!adminPassword.value() || !secureEqual(supplied, adminPassword.value())) {
        return send(res, 401, { ok: false, error: 'unauthorized' });
      }
      const action = body.action;

      if (action === 'check') return send(res, 200, { ok: true });
      if (action === 'pending') {
        const [pending, auto] = await Promise.all([
          db.ref('pending').get(),
          db.ref('config/autoApprove').get()
        ]);
        const raw = pending.val() || {};
        return send(res, 200, {
          ok: true,
          auto: auto.val() === true,
          list: Object.values(raw).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean)
        });
      }
      if (action === 'mode') {
        if (typeof body.auto !== 'boolean') return send(res, 400, { ok: false, error: 'invalid_mode' });
        await db.ref('config/autoApprove').set(body.auto);
        return send(res, 200, { ok: true });
      }
      if (action === 'approve' || action === 'reject') {
        const snapshot = await db.ref('pending').get();
        const pending = snapshot.val() || {};
        let names = body.all === true
          ? Object.values(pending).map(x => typeof x === 'string' ? x : x && x.name).filter(Boolean)
          : Array.isArray(body.names) ? body.names.map(normalizeName).filter(Boolean) : [];
        names = [...new Set(names)].slice(0, MAX_NAMES);
        const updates = {};
        for (const name of names) {
          updates[`pending/${name.replace(/\./g, ',')}`] = null;
        }
        if (action === 'approve' && names.length) {
          const allow = await getAllowList();
          updates.allow = [...new Set([...allow, ...names])];
        }
        if (Object.keys(updates).length) await db.ref().update(updates);
        return send(res, 200, { ok: true, n: names.length });
      }
      if (action === 'allow') {
        if (!Array.isArray(body.names)) return send(res, 400, { ok: false, error: 'invalid_names' });
        const names = [...new Set(body.names.map(normalizeName).filter(Boolean))].slice(0, MAX_NAMES);
        const allow = await getAllowList();
        await db.ref('allow').set([...new Set([...allow, ...names])]);
        return send(res, 200, { ok: true, n: names.length });
      }
      if (action === 'grant') {
        const user = normalizeName(body.user);
        const item = typeof body.k === 'string' ? body.k : '';
        const days = Number.isInteger(Number(body.d)) ? Math.max(0, Math.min(3650, Number(body.d))) : 0;
        if (!user || !ALLOWED_ITEMS.has(item)) return send(res, 400, { ok: false, error: 'invalid_grant' });
        const grantRef = db.ref(`grants/${user.replace(/\./g, ',')}`).push();
        await grantRef.set({ k: item, d: days, createdAt: Date.now() });
        return send(res, 200, { ok: true });
      }
      return send(res, 400, { ok: false, error: 'unknown_action' });
    }

    if (path === '/order') {
      // Do not claim payment or grant items until a verified payment provider webhook exists.
      return send(res, 503, { status: 'error', error: 'payment_not_configured' });
    }

    return send(res, 404, { status: 'error', error: 'not_found' });
  } catch (error) {
    console.error('API request failed:', error && error.message);
    return send(res, 500, { status: 'error', error: 'internal_error' });
  }
});
