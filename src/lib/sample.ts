import type { Atlas, Discovery } from './types';
import type { DomainId } from './domains';

/**
 * Hand-authored illustration of what an atlas looks like. It is NOT a Qloo response and
 * is always rendered with an "Illustrative sample" label.
 */
const F = 'sample-film', M = 'sample-music', B = 'sample-book';

type Row = [name: string, subtitle: string, drivers: [string, number][], shared: string[], affinity: number, popularity: number, note: string];

function lens(domain: DomainId, rows: Row[]): Discovery[] {
  return rows.map(([name, subtitle, drivers, sharedPatterns, affinity, popularity, note], rank) => ({
    id: 'sample-' + domain + '-' + rank,
    name, domain, rank, subtitle, image: null, affinity, popularity,
    drivers: drivers.map(([id, share]) => ({ id, share })),
    sharedPatterns, tags: sharedPatterns, note
  }));
}

export const SAMPLE_ATLAS: Atlas = {
  source: 'sample',
  generatedAt: '2026-01-01T00:00:00.000Z',
  orbit: 'near',
  resolved: [
    { input: 'Blade Runner 2049', domain: 'film', id: F, name: 'Blade Runner 2049', image: null, subtitle: '2017', exact: true },
    { input: 'Frank Ocean', domain: 'music', id: M, name: 'Frank Ocean', image: null, subtitle: null, exact: true },
    { input: 'Norwegian Wood', domain: 'book', id: B, name: 'Norwegian Wood', image: null, subtitle: '1987', exact: true }
  ],
  unresolved: [],
  patterns: [
    { id: 'p1', name: 'Nocturnal', kind: 'keyword:media', affinity: 0.94 },
    { id: 'p2', name: 'Melancholic', kind: 'keyword:media', affinity: 0.91 },
    { id: 'p3', name: 'Solitude', kind: 'keyword:media', affinity: 0.87 },
    { id: 'p4', name: 'Lush minimalism', kind: 'keyword:media', affinity: 0.82 },
    { id: 'p5', name: 'Longing', kind: 'keyword:media', affinity: 0.8 },
    { id: 'p6', name: 'Urban isolation', kind: 'keyword:media', affinity: 0.74 },
    { id: 'p7', name: 'Introspective', kind: 'keyword:media', affinity: 0.71 },
    { id: 'p8', name: 'Dreamlike', kind: 'keyword:media', affinity: 0.66 }
  ],
  patternsNote: null,
  lenses: [
    {
      domain: 'destination', error: null, items: lens('destination', [
        ['Tokyo', 'Japan', [[B, 0.44], [F, 0.34], [M, 0.22]], ['Nocturnal', 'Urban isolation'], 0.93, 0.92, 'Neon density and private solitude — the city Norwegian Wood and 2049 both seem to dream about.'],
        ['Hong Kong', 'China', [[F, 0.52], [M, 0.27], [B, 0.21]], ['Nocturnal', 'Longing'], 0.88, 0.84, 'Vertical, rain-slick and romantic: the original template for cinematic night-city longing.'],
        ['Reykjavík', 'Iceland', [[M, 0.41], [F, 0.38], [B, 0.21]], ['Solitude', 'Lush minimalism'], 0.79, 0.61, 'Vast quiet and stark beauty — the analog of Ocean’s sparse, spacious production.'],
        ['Taipei', 'Taiwan', [[M, 0.39], [B, 0.33], [F, 0.28]], ['Melancholic', 'Introspective'], 0.74, 0.55, 'Late-night food streets and soft-focus introspection; a deeper-orbit cousin of Tokyo.']
      ])
    },
    {
      domain: 'dining', error: null, items: lens('dining', [
        ['JBS — Jazz, Blues & Soul', 'Shibuya, Tokyo', [[M, 0.58], [B, 0.3], [F, 0.12]], ['Introspective', 'Nocturnal'], 0.9, 0.42, 'A tiny listening bar built around one man’s record wall — Murakami’s world as a room.'],
        ['Bar Benfiddich', 'Shinjuku, Tokyo', [[F, 0.4], [B, 0.36], [M, 0.24]], ['Lush minimalism', 'Nocturnal'], 0.84, 0.5, 'Ritual, low light and obsessive craft: the hospitality equivalent of 2049’s production design.'],
        ['Le Mary Celeste', 'Paris', [[M, 0.47], [B, 0.29], [F, 0.24]], ['Longing'], 0.71, 0.63, 'Candlelit, unhurried and quietly cool — closer orbit to Ocean than to the films.']
      ])
    },
    {
      domain: 'tv', error: null, items: lens('tv', [
        ['Severance', 'Apple TV+', [[F, 0.55], [B, 0.27], [M, 0.18]], ['Urban isolation', 'Melancholic'], 0.92, 0.88, 'Identity, memory and sterile beauty — 2049’s questions, in an office.'],
        ['Normal People', 'BBC / Hulu', [[B, 0.51], [M, 0.36], [F, 0.13]], ['Longing', 'Introspective'], 0.86, 0.8, 'Unspoken intimacy and quiet ache: Norwegian Wood’s emotional register, rendered for TV.'],
        ['Devs', 'FX', [[F, 0.48], [M, 0.29], [B, 0.23]], ['Dreamlike', 'Solitude'], 0.77, 0.47, 'Hushed, hypnotic sci-fi — a deep-orbit pick for people who love atmosphere over plot.'],
        ['Station Eleven', 'HBO Max', [[B, 0.42], [M, 0.33], [F, 0.25]], ['Melancholic', 'Longing'], 0.73, 0.52, 'Art as survival after collapse; tender rather than bleak.']
      ])
    }
  ]
};
