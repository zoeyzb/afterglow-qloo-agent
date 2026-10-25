'use strict';
const { validate, buildAtlas } = require('./_lib/atlas');

function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  res.end(JSON.stringify(data));
}

async function handler(req, res) {
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return send(res, 405, { error: 'Use POST to chart an atlas.', code: 'method' }); }
  let body = req.body;
  if (typeof body === 'string') { try { body = JSON.parse(body); } catch { return send(res, 400, { error: 'Invalid JSON.', code: 'invalid' }); } }
  const problem = validate(body);
  if (problem) return send(res, 400, { error: problem, code: 'invalid' });
  const key = process.env.QLOO_API_KEY;
  if (!key) return send(res, 503, { error: 'Live Qloo access is not connected on this deployment. Add an event-issued QLOO_API_KEY on the server to chart real atlases.', code: 'not_configured' });
  try {
    return send(res, 200, await buildAtlas(body, key));
  } catch (error) {
    const status = error && Number.isInteger(error.status) ? error.status : 502;
    return send(res, status, { error: (error && error.message) || 'The Qloo request failed.', code: status === 422 ? 'unresolved' : 'upstream' });
  }
}

module.exports = handler;
