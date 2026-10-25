import type { Discovery } from './types';

export const discoveryKey = (d: Pick<Discovery, 'domain' | 'id'>) => 'd:' + d.domain + ':' + d.id;
