// 범용 TTL 캐시 — 키별 인메모리 캐시 + 만료 시간
const store = new Map<string, { data: unknown; fetchedAt: number }>();

/** TTL 캐시로 래핑. 캐시 히트 시 fetcher 호출하지 않음. */
export async function cached<T>(
  key: string,
  ttl: number,
  fetcher: () => Promise<T>,
): Promise<T> {
  const entry = store.get(key);
  if (entry && Date.now() - entry.fetchedAt < ttl) {
    return entry.data as T;
  }
  const data = await fetcher();
  store.set(key, { data, fetchedAt: Date.now() });
  return data;
}

/** 특정 키 캐시 무효화 */
export function invalidate(key: string): void {
  store.delete(key);
}

/** 접두사로 시작하는 모든 캐시 무효화 */
export function invalidatePrefix(prefix: string): void {
  for (const k of store.keys()) {
    if (k.startsWith(prefix)) store.delete(k);
  }
}
