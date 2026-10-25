export type DomainId =
  | 'film' | 'tv' | 'music' | 'book' | 'creator'
  | 'podcast' | 'game' | 'destination' | 'dining' | 'brand';

export interface Domain {
  id: DomainId;
  label: string;
  noun: string;
  hue: string;
  glyph: string;
  placeholder: string;
}

export const DOMAINS: Domain[] = [
  { id: 'film', label: 'Film', noun: 'film', hue: '#f2a65a', glyph: '◐', placeholder: 'A film you rewatch — e.g. In the Mood for Love' },
  { id: 'music', label: 'Music', noun: 'artist', hue: '#a98bff', glyph: '♫', placeholder: 'An artist on repeat — e.g. Frank Ocean' },
  { id: 'book', label: 'Books', noun: 'book', hue: '#5fd0bd', glyph: '❘❘', placeholder: 'A book that stayed — e.g. Norwegian Wood' },
  { id: 'tv', label: 'TV', noun: 'series', hue: '#ff7f6e', glyph: '▭', placeholder: 'A series you evangelize — e.g. Severance' },
  { id: 'creator', label: 'Creators', noun: 'person', hue: '#f6d36b', glyph: '✦', placeholder: 'A director, author or icon — e.g. Wong Kar-wai' },
  { id: 'dining', label: 'Dining & places', noun: 'place', hue: '#ff9d7d', glyph: '◇', placeholder: 'A restaurant or bar you love — e.g. Noma' },
  { id: 'destination', label: 'Destinations', noun: 'destination', hue: '#ff8fcf', glyph: '◎', placeholder: 'A city that feels like you — e.g. Kyoto' },
  { id: 'podcast', label: 'Podcasts', noun: 'podcast', hue: '#7fb4ff', glyph: '◉', placeholder: 'A show in your ears — e.g. Song Exploder' },
  { id: 'game', label: 'Games', noun: 'game', hue: '#8fe39a', glyph: '◆', placeholder: 'A game you lost weeks to — e.g. Journey' },
  { id: 'brand', label: 'Brands', noun: 'brand', hue: '#cfd2e6', glyph: '◈', placeholder: 'A brand you trust — e.g. Aesop' }
];

export const DOMAIN_MAP = Object.fromEntries(DOMAINS.map(d => [d.id, d])) as Record<DomainId, Domain>;

export const LIMITS = { minSignals: 2, maxSignals: 5, maxLenses: 4 } as const;

export interface SignalDraft { id: string; domain: DomainId; name: string }

export const EXAMPLE_SETS: { id: string; title: string; mood: string; signals: Omit<SignalDraft, 'id'>[]; lenses: DomainId[] }[] = [
  {
    id: 'neon',
    title: 'Neon melancholy',
    mood: 'Nocturnal · lush · longing',
    signals: [
      { domain: 'film', name: 'Blade Runner 2049' },
      { domain: 'music', name: 'Frank Ocean' },
      { domain: 'book', name: 'Norwegian Wood' }
    ],
    lenses: ['destination', 'dining', 'tv']
  },
  {
    id: 'wonder',
    title: 'Strange wonder',
    mood: 'Surreal · tender · handmade',
    signals: [
      { domain: 'film', name: 'Spirited Away' },
      { domain: 'music', name: 'Björk' },
      { domain: 'book', name: 'Piranesi' }
    ],
    lenses: ['game', 'destination', 'podcast']
  },
  {
    id: 'craft',
    title: 'Obsessive craft',
    mood: 'Precise · warm · restless',
    signals: [
      { domain: 'tv', name: 'The Bear' },
      { domain: 'creator', name: 'Anthony Bourdain' },
      { domain: 'music', name: 'LCD Soundsystem' }
    ],
    lenses: ['dining', 'book', 'film']
  }
];
