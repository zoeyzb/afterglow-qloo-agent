import type { Atlas, AtlasErrorCode, AtlasRequest } from './types';

export class AtlasError extends Error {
  constructor(message: string, readonly code: AtlasErrorCode) { super(message); }
}

export type LiveStatus = 'checking' | 'configured' | 'offline' | 'unknown';

export async function fetchStatus(): Promise<LiveStatus> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 4000);
  try {
    const res = await fetch('/api/status', { cache: 'no-store', signal: controller.signal });
    if (!res.ok) return 'unknown';
    const data = await res.json();
    return data?.configured ? 'configured' : 'offline';
  } catch {
    return 'unknown';
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function chartAtlas(request: AtlasRequest, signal?: AbortSignal): Promise<Atlas> {
  let res: Response;
  try {
    res = await fetch('/api/atlas', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(request), signal });
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error;
    throw new AtlasError('Could not reach the TasteAtlas server. Check your connection and try again.', 'network');
  }
  let data: unknown = null;
  try { data = await res.json(); } catch { /* handled below */ }
  const body = data as Partial<Atlas> & { error?: string; code?: AtlasErrorCode } | null;
  if (!res.ok) {
    const code: AtlasErrorCode = body?.code ?? (res.status === 503 ? 'not_configured' : 'upstream');
    throw new AtlasError(body?.error || 'The atlas request failed (HTTP ' + res.status + ').', code);
  }
  if (!body || body.source !== 'qloo' || !Array.isArray(body.lenses) || !Array.isArray(body.resolved)) {
    throw new AtlasError('The server returned an incomplete atlas.', 'upstream');
  }
  return body as Atlas;
}
