# TasteAtlas AI — an interactive 3D map of your taste universe

**TasteAtlas AI** turns 2–5 things you love (a film, an artist, a book, a restaurant, a city, a podcast…) into an explorable 3D atlas. The backend is built to query Qloo's cultural graph for cross-domain affinities and explainable discoveries. **Live Qloo results have not yet been tested with the event-issued key.** The deployed site currently offers a clearly labeled sample atlas with illustrative results.

Built by **Sierra Byrd** for the **Qloo Agentic Hackathon 2026**.

## How it works

Add 2–5 favorites across supported cultural categories. Choose up to four **result categories**—these determine what the app should recommend, not what the user must enter. Choose the closest matches or less mainstream discoveries. The backend resolves the inputs, requests Qloo affinities and recommendations, and returns available explanation data. Music results currently describe artists; the site does not stream or play songs.

A few favorites can reveal affinities that are not obvious within just one category. Recommendations reflect Qloo's aggregate cultural data; they are not proven personal preferences.

## The experience

1. **3D hero.** A live orbital "taste universe" (React Three Fiber) with one orbit per cultural domain.
2. **How it works.** A scroll-pinned GSAP story: Favorites → Connections → Discoveries.
3. **Why it works.** An interactive Venn showing how the overlap narrows as you combine signals.
4. **Chart yours.** Pick a domain, type a favorite, press Enter. A live constellation forms as you add 2–5 favorites. Choose 1–4 discovery categories and **Closest matches** or **Surprise me**.
5. **Your atlas.** A draggable 3D taste graph (signals → shared patterns → discoveries, with edges weighted by Qloo attribution), a Taste DNA panel, and explainable discovery cards you can save to a browser-local collection.

## Honest by design

- Results come **only** from the live Qloo API. If no key is configured, the API answers `503 not_configured` and the UI says so plainly.
- Favorites Qloo can't resolve are listed as "left out", and a domain that fails is shown as an error instead of being filled with guesses.
- The **sample atlas** is opt-in only. It's hand-written to demonstrate the experience and is labelled "Illustrative sample" everywhere it appears. Every pattern, score and note in it is an example, not a Qloo result.
- The nav badge reports only whether a key is *configured* (`/api/status`). It does not claim Qloo is reachable.
- Recommendations describe aggregate cultural affinity, not claims about a person's identity.

## Agent workflow (`POST /api/atlas`)

```json
{
  "signals": [{ "domain": "film", "name": "Blade Runner 2049" }, { "domain": "music", "name": "Frank Ocean" }],
  "lenses": ["destination", "dining", "tv"],
  "orbit": "near"
}
```

1. Validates 2–5 signals and 1–4 lenses across ten domains: `film, tv, music, book, creator, podcast, game, destination, dining, brand`.
2. Resolves each signal in parallel with `GET /search` (an exact name match is preferred), deduplicates IDs, and records unresolved names.
3. **Taste analysis:** `GET /v2/insights?filter.type=urn:tag&signal.interests.entities=…` returns the shared pattern tags. If this step fails, the response says so in `patternsNote`.
4. For each lens: `GET /v2/insights` with `filter.type`, the combined `signal.interests.entities`, the inputs excluded, and `feature.explainability=true`. The server parses per-signal attribution, affinity, popularity, tags and images. Deep space skips the top matches and prefers lower popularity.
5. Returns `{ source: "qloo", resolved, unresolved, patterns, patternsNote, lenses: [{ domain, items, error }] }`. All Qloo calls are server-side with 10s timeouts. The key is never logged or sent to the browser.

## Stack

Vite · React 19 · TypeScript · Three.js / React Three Fiber / drei · GSAP ScrollTrigger · Framer Motion. Serverless Node functions in `api/` (Vercel) and a zero-dependency local server in `server.cjs`.

Performance: three.js is lazy-loaded and kept out of the first-paint bundle. 3D scenes pause when offscreen and cap device pixel ratio. Glow comes from sprites, not a bloom pass. `prefers-reduced-motion` is respected throughout (static story, no auto-rotation). Without WebGL the page falls back to the regular UI.

## Run locally

Requires Node.js 20+.

```sh
npm install
npm test          # API orchestration tests (mocked Qloo)
npm run typecheck
npm run build
npm start         # serves dist/ + /api on http://localhost:3000
```

For frontend development with hot reload, run `npm start` (API) and `npm run dev` (Vite proxies `/api` to port 3000).

## Qloo setup

Request an event-issued key via the [hackathon developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide), then set `QLOO_API_KEY` as a server-side secret (on Vercel, under Project → Settings → Environment Variables). Optional: `QLOO_BASE_URL` (default `https://hackathon.api.qloo.com`). **Never commit keys or expose them to the browser.**

## Competition checklist

- [x] Original source code, public repo, MIT license
- [x] Interactive 3D experience with explainable, cross-domain Qloo orchestration
- [x] Offline automated tests for orchestration, attribution parsing and error paths
- [ ] Event-issued key configured on live hosting
- [ ] Verified live Qloo responses end-to-end
- [ ] Published Devpost submission

## Qloo integration: remaining launch checklist

The Qloo Agentic Hackathon requires a functional, externally hosted, Qloo-powered experience. As of October 26, 2026, the production deployment has **no event-issued Qloo key configured**, so its real-results workflow is **not verified**. The project page is published on Devpost but **the competition entry has not been submitted**.

1. Request an individual event credential through the [official developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key) or use an organizer-approved authenticated gateway.
2. Store the key as `QLOO_API_KEY` in Vercel's protected server environment; do not expose it in browser code, a GitHub repository, screenshots or chat logs.
3. Redeploy, check `GET /api/status` (configuration only), then run `POST /api/atlas` with 2–5 **real** inputs and 1–4 result categories. Confirm genuine results, supported entity types, filters, explanations and error handling. A configured status alone does not prove successful API access.
4. After confirming live integration, update Devpost's current integration-status paragraph and complete the hackathon submission questions. Submission requires a live demo URL, public repository, project description and visible open-source license; no demo video is required.

For the official CLI/MCP starter, see the [Qloo hackathon kit](https://github.com/qloo/qloo-hackathon-kit). It also requires an individual credential.

## License

MIT © Sierra Byrd.
