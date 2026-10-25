import type { DomainId } from './domains';

export type Orbit = 'near' | 'far';

export interface ResolvedSignal {
  input: string;
  domain: DomainId;
  id: string;
  name: string;
  image: string | null;
  subtitle: string | null;
  exact: boolean;
}

export interface TastePattern {
  id: string;
  name: string;
  kind: string | null;
  affinity: number | null;
}

export interface Driver { id: string; share: number }

export interface Discovery {
  id: string;
  name: string;
  domain: DomainId;
  rank: number;
  subtitle: string | null;
  image: string | null;
  affinity: number | null;
  popularity: number | null;
  drivers: Driver[];
  sharedPatterns: string[];
  tags: string[];
  /** Hand-written rationale; only present on the illustrative sample. */
  note?: string;
}

export interface Lens { domain: DomainId; items: Discovery[]; error: string | null }

export interface Atlas {
  source: 'qloo' | 'sample';
  generatedAt: string;
  orbit: Orbit;
  resolved: ResolvedSignal[];
  unresolved: { input: string; domain: DomainId }[];
  patterns: TastePattern[];
  patternsNote: string | null;
  lenses: Lens[];
}

export type AtlasErrorCode = 'not_configured' | 'unresolved' | 'invalid' | 'upstream' | 'network';

export interface AtlasRequest {
  signals: { domain: DomainId; name: string }[];
  lenses: DomainId[];
  orbit: Orbit;
}
