import type { IncidentLocation } from '../contracts';

export type CachedGeocodingEntry = Readonly<{
  location: IncidentLocation;
  cachedAt: number;
  expiresAt: number;
}>;

export type GeocodingCacheOptions = Readonly<{
  defaultTtlMs?: number;
  maxEntries?: number;
}>;

/**
 * In-memory bounded cache for geocoded locations to prevent hitting provider rate limits (429)
 * and provide resilience during intermittent connectivity disruptions.
 */
export class GeocodingCache {
  private readonly entries = new Map<string, CachedGeocodingEntry>();
  private readonly defaultTtlMs: number;
  private readonly maxEntries: number;

  public constructor(options?: GeocodingCacheOptions) {
    this.defaultTtlMs = options?.defaultTtlMs ?? 5 * 60 * 1000; // 5 minutes default TTL
    this.maxEntries = options?.maxEntries ?? 100; // 100 bounded entries
  }

  private normalizeKey(query: string): string {
    return query.trim().toLowerCase();
  }

  public get(query: string, now: number = Date.now()): IncidentLocation | null {
    const key = this.normalizeKey(query);
    if (!key) return null;

    const entry = this.entries.get(key);
    if (!entry) return null;

    if (now > entry.expiresAt) {
      this.entries.delete(key);
      return null;
    }

    return entry.location;
  }

  public set(
    query: string,
    location: IncidentLocation,
    ttlMs: number = this.defaultTtlMs,
    now: number = Date.now(),
  ): void {
    const key = this.normalizeKey(query);
    if (!key) return;

    if (this.entries.size >= this.maxEntries && !this.entries.has(key)) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey !== undefined) {
        this.entries.delete(oldestKey);
      }
    }

    this.entries.set(key, {
      location,
      cachedAt: now,
      expiresAt: now + ttlMs,
    });
  }

  public has(query: string, now: number = Date.now()): boolean {
    return this.get(query, now) !== null;
  }

  public delete(query: string): boolean {
    const key = this.normalizeKey(query);
    return this.entries.delete(key);
  }

  public clear(): void {
    this.entries.clear();
  }

  public size(): number {
    return this.entries.size;
  }
}
