'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const handler = require('../api/atlas.js');
const status = require('../api/status.js');
const { _internal } = require('../api/_lib/atlas.js');

function response() {
  return { statusCode: 200, headers: {}, setHeader(k, v) { this.headers[k] = v; }, end(s) { this.body = JSON.parse(s); } };
}
async function call(body, method = 'POST') { const res = response(); await handler({ method, body }, res); return res; }
const input = {
  signals: [{ domain: 'film', name: 'Interstellar' }, { domain: 'music', name: 'Khruangbin' }, { domain: 'book', name: 'Piranesi' }],
  lenses: ['book', 'destination'],
  orbit: 'near'
};
const ids = { Interstellar: 'id-film', Khruangbin: 'id-music', Piranesi: 'id-book' };

function withKey(key, fn) {
  return async () => {
    const prev = process.env.QLOO_API_KEY;
    if (key === null) delete process.env.QLOO_API_KEY; else process.env.QLOO_API_KEY = key;
    try { await fn(); } finally { if (prev === undefined) delete process.env.QLOO_API_KEY; else process.env.QLOO_API_KEY = prev; }
  };
}
function ok(payload) { return { ok: true, status: 200, text: async () => JSON.stringify(payload) }; }

function mockQloo(calls, overrides = {}) {
  global.fetch = async url => {
    const u = new URL(url);
    calls.push(u);
    if (u.pathname === '/search') {
      const q = u.searchParams.get('query');
      if (overrides.unknown && overrides.unknown.includes(q)) return ok({ results: { entities: [] } });
      return ok({ results: { entities: [{ entity_id: ids[q], name: q }] } });
    }
    if (u.pathname === '/v2/insights' && u.searchParams.get('filter.type') === 'urn:tag') {
      if (overrides.tagsFail) return { ok: false, status: 500, text: async () => '{}' };
      return ok({ results: { tags: [{ tag_id: 'urn:tag:keyword:media:solitude', name: 'Solitude', subtype: 'urn:tag:keyword:media' }, { tag_id: 'urn:tag:keyword:media:dreamlike', name: 'Dreamlike' }] } });
    }
    if (u.pathname === '/v2/insights') {
      const type = u.searchParams.get('filter.type');
      if (overrides.failType === type) return { ok: false, status: 500, text: async () => '{}' };
      return ok({ results: { entities: Array.from({ length: 12 }, (_, i) => ({
        entity_id: type + '-' + i, name: 'Result ' + (i + 1), popularity: 1 - i / 20,
        tags: [{ tag_id: 't', name: i % 2 ? 'Solitude' : 'Neon' }],
        query: { affinity: 0.9 - i / 50, explainability: { 'signal.interests.entities': [{ entity_id: 'id-film', score: 0.6 }, { entity_id: 'id-music', score: 0.2 }] } }
      })) } });
    }
    throw new Error('unexpected path ' + u.pathname);
  };
}

test('rejects non-POST and invalid bodies before touching Qloo', withKey('k', async () => {
  let requests = 0;
  global.fetch = async () => { requests++; throw new Error('no network'); };
  assert.equal((await call(input, 'GET')).statusCode, 405);
  assert.equal((await call({ ...input, signals: input.signals.slice(0, 1) })).statusCode, 400);
  assert.equal((await call({ ...input, lenses: [] })).statusCode, 400);
  assert.equal((await call({ ...input, lenses: ['film', 'film'] })).statusCode, 400);
  assert.equal((await call({ ...input, orbit: 'sideways' })).statusCode, 400);
  assert.equal((await call({ ...input, signals: [{ domain: 'cooking', name: 'x' }, { domain: 'film', name: 'y' }] })).statusCode, 400);
  assert.equal(requests, 0);
}));

test('reports a missing key honestly instead of inventing results', withKey(null, async () => {
  const r = await call(input);
  assert.equal(r.statusCode, 503);
  assert.equal(r.body.code, 'not_configured');
  assert.equal(r.body.lenses, undefined);
}));

test('status endpoint only reports configuration', withKey(null, async () => {
  const res = response();
  status({}, res);
  assert.deepEqual(res.body, { configured: false });
}));

test('resolves signals, extracts patterns and charts explainable discoveries', withKey('unit', async () => {
  const calls = [];
  mockQloo(calls);
  const r = await call(input);
  assert.equal(r.statusCode, 200);
  assert.equal(r.body.source, 'qloo');
  assert.equal(r.body.resolved.length, 3);
  assert.deepEqual(r.body.patterns.map(p => p.name), ['Solitude', 'Dreamlike']);
  assert.equal(r.body.lenses.length, 2);
  const first = r.body.lenses[0].items[0];
  assert.equal(r.body.lenses[0].items.length, 6);
  assert.equal(first.name, 'Result 1');
  assert.equal(first.drivers[0].id, 'id-film');
  assert.ok(Math.abs(first.drivers[0].share - 0.75) < 1e-9);
  const tagCall = calls.find(u => u.searchParams.get('filter.type') === 'urn:tag');
  assert.equal(tagCall.searchParams.get('signal.interests.entities'), 'id-film,id-music,id-book');
  const bookCall = calls.find(u => u.searchParams.get('filter.type') === 'urn:entity:book');
  assert.equal(bookCall.searchParams.get('filter.exclude.entities'), 'id-film,id-music,id-book');
  assert.equal(r.body.lenses[0].items[1].sharedPatterns[0], 'Solitude');
}));

test('deep space skips the most obvious matches', withKey('unit', async () => {
  mockQloo([]);
  const r = await call({ ...input, orbit: 'far' });
  const names = r.body.lenses[0].items.map(i => i.name);
  assert.ok(!names.includes('Result 1'));
  assert.equal(names.length, 6);
}));

test('reports unresolved signals and partial domain failures transparently', withKey('unit', async () => {
  mockQloo([], { unknown: ['Piranesi'], failType: 'urn:entity:destination', tagsFail: true });
  const r = await call(input);
  assert.equal(r.statusCode, 200);
  assert.deepEqual(r.body.unresolved, [{ input: 'Piranesi', domain: 'book' }]);
  assert.match(r.body.patternsNote, /unavailable/);
  assert.equal(r.body.lenses[1].items.length, 0);
  assert.ok(r.body.lenses[1].error);
}));

test('returns 422 when nothing resolves', withKey('unit', async () => {
  mockQloo([], { unknown: ['Interstellar', 'Khruangbin', 'Piranesi'] });
  const r = await call(input);
  assert.equal(r.statusCode, 422);
  assert.equal(r.body.code, 'unresolved');
}));

test('handles auth failures without leaking the credential', withKey('test-SECRET-should-not-leak', async () => {
  global.fetch = async () => ({ ok: false, status: 401, text: async () => '{"message":"bad"}' });
  const r = await call(input);
  assert.equal(r.statusCode, 502);
  assert.match(r.body.error, /rejected the credential/);
  assert.ok(!JSON.stringify(r.body).includes('SECRET'));
}));

test('explainability parser handles keyed and nested shapes', () => {
  const seeds = new Set(['a', 'b']);
  assert.deepEqual(_internal.explainDrivers({ query: { explainability: { a: 3, b: 1, c: 9 } } }, seeds).map(d => d.id), ['a', 'b']);
  assert.deepEqual(_internal.explainDrivers({}, seeds), []);
});
