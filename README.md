# Afterglow — Cultural Taste Cartographer

**Afterglow** is an original cultural discovery web app by **Sierra Byrd** built for the **Qloo Agentic Hackathon 2026**. It combines multiple cultural anchors (films, music, books) and uses Qloo's search and Insights APIs to generate grounded cross-category recommendations. Instead of hallucinating suggestions, it explicitly reports when Qloo access is missing, when entities cannot be found, or when the graph returns no matches.

## The agent workflow

1. The user selects 2–4 cultural favorites, their entity types, and a destination category.
2. The backend resolves each favorite independently using Qloo entity search.
3. It automatically chooses exact or first available matches, records unresolved names, deduplicates Qloo IDs, then queries Qloo Insights with those IDs.
4. It excludes input entities from results, provides ranked Qloo recommendations, and offers **Close connections** or **Beyond the obvious** refinement.
5. The frontend renders only verified API-sourced recommendations and communicates all failure conditions.

This is **aggregate cultural-affinity research**, not a claim about an individual's identity, personality, or future choices.

## Run locally

Requires Node.js 20+.

```sh
npm test
npm start
```

Visit http://localhost:3000.

**The recommendation function requires event-issued API access.** Without the Qloo key the site still renders, but it shows a truthful 503 setup message instead of simulated recommendations.

## Qloo setup

Obtain your own **event-issued** credential using the [official developer guide](https://docs.qloo.com/reference/qloo-llm-hackathon-developer-guide#getting-your-api-key), then configure `QLOO_API_KEY` as a secret on your hosting platform or shell. **Do not commit keys or expose them to the browser.** If the event provides a different host, set `QLOO_BASE_URL` accordingly. Default: `https://hackathon.api.qloo.com`.

API routes used:
- `GET /search` — resolve film, artist, book entity IDs.
- `GET /v2/insights` — return related entities with optional explainability.

`POST /api/discover` accepts:
```json
{"favorites":[{"type":"movie","name":"Interstellar"},{"type":"artist","name":"Khruangbin"}],"category":"book","depth":"familiar"}
```

Returns `source`, `resolved`, `unresolved`, and `picks` or an explicit JSON error. All Qloo requests are server-side with bounded timeouts and no credential logging.

## Competition checklist

- [x] Original source code, public repo, and MIT license
- [x] Responsive interface and real server-side Qloo integration code
- [x] Offline automated unit tests for orchestration and error paths
- [ ] Event-issued key configured on live hosting
- [ ] Verified live Qloo response and end-to-end judge testing
- [ ] Completed and published Devpost submission

**The project is not a qualifying finished submission until the last items are completed.** No Qloo result or completed Devpost entry should be claimed before live testing.

## License

MIT © Sierra Byrd.
