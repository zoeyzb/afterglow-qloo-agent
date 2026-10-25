import { useCallback, useEffect, useState } from 'react';
import type { DomainId } from './domains';

export interface SavedItem { key: string; name: string; domain: DomainId; source: 'qloo' | 'sample' }

const STORAGE_KEY = 'tasteatlas-collection-v1';

function read(): SavedItem[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    return Array.isArray(parsed) ? parsed.filter(x => x && typeof x.key === 'string' && typeof x.name === 'string').slice(0, 60) : [];
  } catch {
    return [];
  }
}

export function useCollection() {
  const [items, setItems] = useState<SavedItem[]>(read);
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); } catch { /* storage may be disabled */ }
  }, [items]);
  const has = useCallback((key: string) => items.some(i => i.key === key), [items]);
  const toggle = useCallback((item: SavedItem) => {
    setItems(prev => prev.some(i => i.key === item.key) ? prev.filter(i => i.key !== item.key) : [...prev, item].slice(-60));
  }, []);
  const remove = useCallback((key: string) => setItems(prev => prev.filter(i => i.key !== key)), []);
  const clear = useCallback(() => setItems([]), []);
  return { items, has, toggle, remove, clear };
}

export type Collection = ReturnType<typeof useCollection>;
