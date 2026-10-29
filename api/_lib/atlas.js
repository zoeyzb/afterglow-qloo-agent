'use strict';
/** TasteAtlas AI — Qloo orchestration. Server only: QLOO_API_KEY must never reach the browser. */

const DOMAINS = {
  film: { urn: 'urn:entity:movie', label: 'Film' },
  tv: { urn: 'urn:entity:tv_show', label: 'TV' },
  music: { urn: 'urn:entity:artist', label: 'Music' },
  book: { urn: 'urn:entity:book', label: 'Books' },
  creator: { urn: 'urn:entity:person', label: 'Creators' },
  podcast: { urn: 'urn:entity:podcast', label: 'Podcasts' },
  game: { urn: 'urn:entity:video_game', label: 'Games' },
  destination: { urn: 'urn:entity:destination', label: 'Destinations' },
  dining: { urn: 'urn:entity:place', label: 'Dining & places' },
  brand: { urn: 'urn:entity:brand', label: 'Brands' }
};

const LIMITS = { minSignals: 2, maxSignals: 5, maxLenses: 4, maxName: 80, perLens: 6 };
const TIMEOUT_MS = 10000;

class QlooError extends Error {
  constructor(message, status = 502) { super(message); this.status = status; }
}

function baseUrl() { return process.env.QLOO_BASE_URL || 'https://hackathon.api.qloo.com'; }

async function getQloo(route, params, apiKey) {
  const url = new URL(route, baseUrl());
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') url.searchParams.set(key, String(value));
  }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch(url, { method: 'GET', headers: { 'X-Api-Key': apiKey, Accept: 'application/json' }, signal: controller.signal });
    const text = await response.text();
    if (!response.ok) {
      if (response.status === 401) throw new QlooError('Qloo rejected the credential. Check the event-issued QLOO_API_KEY and base URL.');
      if (response.status === 403) throw new QlooError('Qloo denied access to this request type.', 502);
      if (response.status === 429) throw new QlooError('Qloo rate limit reached. Try again in a moment.', 429);
      throw new QlooError('Qloo request failed (HTTP ' + response.status + ').');
    }
    try { return JSON.parse(text); } catch { throw new QlooError('Qloo returned a non-JSON response.'); }
  } catch (error) {
    if (error && error.name === 'AbortError') throw new QlooError('Qloo request timed out.', 504);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}

function extractEntities(data) {
  if (Array.isArray(data?.results?.entities)) return data.results.entities;
  if (Array.isArray(data?.results)) return data.results;
  if (Array.isArray(data?.entities)) return data.entities;
  if (Array.isArray(data?.data)) return data.data;
  return [];
}
function extractTags(data) {
  if (Array.isArray(data?.results?.tags)) return data.results.tags;
  if (Array.isArray(data?.tags)) return data.tags;
  return [];
}
const entityId = e => String(e?.entity_id || e?.id || e?.entity?.entity_id || e?.entity?.id || '');
const entityName = e => String(e?.name || e?.title || e?.entity?.name || e?.properties?.name || '').trim();
const finite = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);

function entityImage(e) {
  const url = e?.properties?.image?.url || e?.image?.url;
  return typeof url === 'string' && /^https:\/\//.test(url) ? url : null;
}
function entitySubtitle(e) {
  const p = e?.properties || {};
  const year = p.release_year || p.publication_year || (typeof p.release_date === 'string' ? p.release_date.slice(0, 4) : null);
  const where = p.geocode?.city || p.address || e?.disambiguation || null;
  return [year, where].filter(Boolean).map(String).join(' · ') || null;
}
function entityTags(e) {
  const tags = Array.isArray(e?.tags) ? e.tags : [];
  return tags.map(t => ({ id: String(t?.tag_id || t?.id || ''), name: String(t?.name || '').trim() })).filter(t => t.name).slice(0, 24);
}

/**
 * Qloo's explainability payload has shifted shape between API versions, so walk it and
 * collect any {entity_id, score} pairs that point back at the user's resolved signals.
 */
function explainDrivers(e, seedIds) {
  const root = e?.query?.explainability || e?.explainability;
  if (!root || typeof root !== 'object') return [];
  const scores = new Map();
  const visit = (node, depth) => {
    if (!node || depth > 5) return;
    if (Array.isArray(node)) { node.forEach(n => visit(n, depth + 1)); return; }
    if (typeof node !== 'object') return;
    const id = node.entity_id || node.id;
    const score = finite(node.score) ?? finite(node.affinity) ?? finite(node.weight);
    if (id && score !== null && seedIds.has(String(id))) scores.set(String(id), Math.max(scores.get(String(id)) || 0, score));
    for (const [key, value] of Object.entries(node)) {
      if (seedIds.has(key) && finite(value) !== null) scores.set(key, Math.max(scores.get(key) || 0, value));
      else if (value && typeof value === 'object') visit(value, depth + 1);
    }
  };
  visit(root, 0);
  const total = [...scores.values()].reduce((a, b) => a + Math.max(b, 0), 0);
  if (!total) return [];
  return [...scores.entries()].map(([id, s]) => ({ id, share: Math.max(s, 0) / total })).sort((a, b) => b.share - a.share);
}

function validate(body) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return 'Send a JSON body.';
  const { signals, lenses, orbit } = body;
  if (!Array.isArray(signals) || signals.length < LIMITS.minSignals || signals.length > LIMITS.maxSignals) return 'Add 2–5 things you love.';
  for (const s of signals) {
    if (!s || !DOMAINS[s.domain] || typeof s.name !== 'string' || !s.name.trim() || s.name.length > LIMITS.maxName) return 'Each signal needs a supported domain and a short name.';
  }
  if (!Array.isArray(lenses) || !lenses.length || lenses.length > LIMITS.maxLenses || new Set(lenses).size !== lenses.length || lenses.some(l => !DOMAINS[l])) return 'Choose 1–4 discovery domains.';
  if (!['near', 'far'].includes(orbit)) return 'Orbit must be "near" or "far".';
  return null;
}

async function resolveSignal(signal, apiKey) {
  const data = await getQloo('/search', { query: signal.name, types: DOMAINS[signal.domain].urn, take: 5 }, apiKey);
  const candidates = extractEntities(data).filter(e => entityId(e) && entityName(e));
  const wanted = signal.name.toLowerCase();
  const hit = candidates.find(e => entityName(e).toLowerCase() === wanted) || candidates[0];
  if (!hit) return null;
  return { input: signal.name, domain: signal.domain, id: entityId(hit), name: entityName(hit), image: entityImage(hit), subtitle: entitySubtitle(hit), exact: entityName(hit).toLowerCase() === wanted };
}

async function tastePatterns(ids, domains, apiKey) {
  const parents = [...new Set(domains.map(d => DOMAINS[d].urn))].join(',');
  const data = await getQloo('/v2/insights', { 'filter.type': 'urn:tag', 'signal.interests.entities': ids.join(','), 'filter.parents.types': parents, take: 14 }, apiKey);
  const seen = new Set();
  return extractTags(data).map(t => ({
    id: String(t?.tag_id || t?.id || ''),
    name: String(t?.name || '').trim(),
    kind: String(t?.subtype || t?.type || '').replace(/^urn:tag:/, '') || null,
    affinity: finite(t?.query?.affinity)
  })).filter(t => t.id && t.name && !seen.has(t.name.toLowerCase()) && seen.add(t.name.toLowerCase())).slice(0, 12);
}

async function chartLens(lens, ids, seedIds, orbit, patterns, apiKey) {
  const data = await getQloo('/v2/insights', {
    'filter.type': DOMAINS[lens].urn,
    'signal.interests.entities': ids.join(','),
    'filter.exclude.entities': ids.join(','),
    'feature.explainability': 'true',
    take: orbit === 'far' ? 24 : 12
  }, apiKey);
  const patternNames = new Set(patterns.map(p => p.name.toLowerCase()));
  const seen = new Set(ids);
  const items = [];
  extractEntities(data).forEach((e, rank) => {
    const id = entityId(e), name = entityName(e);
    if (!id || !name || seen.has(id)) return;
    seen.add(id);
    const tags = entityTags(e);
    items.push({
      id, name, domain: lens, rank,
      subtitle: entitySubtitle(e),
      image: entityImage(e),
      affinity: finite(e?.query?.affinity),
      popularity: finite(e?.popularity) ?? finite(e?.properties?.popularity),
      drivers: explainDrivers(e, seedIds),
      sharedPatterns: tags.filter(t => patternNames.has(t.name.toLowerCase())).map(t => t.name).slice(0, 4),
      tags: tags.map(t => t.name).slice(0, 6)
    });
  });
  if (orbit === 'near') return items.slice(0, LIMITS.perLens);
  // Deep space: skip the head of the ranking, then favour the least mainstream of what remains.
  const tail = items.slice(4);
  const pool = tail.length >= LIMITS.perLens ? tail : items;
  const hasPopularity = pool.some(i => i.popularity !== null);
  const ordered = hasPopularity ? [...pool].sort((a, b) => (a.popularity ?? 1) - (b.popularity ?? 1)) : pool;
  return ordered.slice(0, LIMITS.perLens).sort((a, b) => a.rank - b.rank);
}

async function buildAtlas(body, apiKey) {
  const signals = body.signals.map(s => ({ domain: s.domain, name: s.name.trim() }));
  const found = await Promise.all(signals.map(s => resolveSignal(s, apiKey)));
  const resolved = [];
  const seenIds = new Set();
  found.forEach(r => { if (r && !seenIds.has(r.id)) { seenIds.add(r.id); resolved.push(r); } });
  const unresolved = signals.filter((_, i) => !found[i]).map(s => ({ input: s.name, domain: s.domain }));
  if (!resolved.length) throw new QlooError('Qloo could not find any of your signals. Try exact titles or names.', 422);

  const ids = resolved.map(r => r.id);
  const domains = [...new Set([...resolved.map(r => r.domain), ...body.lenses])];

  let patterns = [];
  let patternsNote = null;
  try {
    patterns = await tastePatterns(ids, domains, apiKey);
    if (!patterns.length) patternsNote = 'Qloo returned no shared taste tags for this combination.';
  } catch (error) {
    patternsNote = 'Taste patterns unavailable: ' + (error.message || 'request failed.');
  }

  const lensFailures = [];
  const lenses = await Promise.all(body.lenses.map(async lens => {
    try {
      return { domain: lens, items: await chartLens(lens, ids, seenIds, body.orbit, patterns, apiKey), error: null };
    } catch (error) {
      if (error && error.status === 429) throw error;
      lensFailures.push(error);
      return { domain: lens, items: [], error: error.message || 'This domain could not be charted.' };
    }
  }));
  if (lenses.every(l => l.error)) {
    const retryableFailure = lensFailures.find(error => error && (error.status === 429 || error.status === 504));
    if (retryableFailure) throw retryableFailure;
    throw new QlooError(lenses[0].error);
  }

  return { source: 'qloo', generatedAt: new Date().toISOString(), orbit: body.orbit, resolved, unresolved, patterns, patternsNote, lenses };
}

module.exports = { DOMAINS, LIMITS, QlooError, validate, buildAtlas, _internal: { extractEntities, extractTags, entityId, entityName, explainDrivers } };
