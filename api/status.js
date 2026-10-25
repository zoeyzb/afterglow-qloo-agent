'use strict';

module.exports = function status(req, res) {
  res.statusCode = 200;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'no-store');
  // Only reports whether a key is configured; it does not claim Qloo is reachable.
  res.end(JSON.stringify({ configured: Boolean(process.env.QLOO_API_KEY) }));
};
