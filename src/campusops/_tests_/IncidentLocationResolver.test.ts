import { resolveIncidentLocation } from '../application/IncidentLocationResolver';
import { GeocodingCache } from '../infrastructure/GeocodingCache';
import type { IncidentLocation } from '../contracts';

describe('IncidentLocationResolver & GeocodingCache (Week 09)', () => {
  const manualFallback = 'Laboratorio Central - Edificio B';

  describe('resolveIncidentLocation - Nominal cases', () => {
    it('accepts valid geocoding coordinates and returns provider source', () => {
      const validPayload = {
        label: 'Biblioteca Central',
        latitude: 19.3328,
        longitude: -99.1873,
      };

      const result = resolveIncidentLocation(validPayload, manualFallback);

      expect(result).toEqual<IncidentLocation>({
        source: 'provider',
        label: 'Biblioteca Central',
        latitude: 19.3328,
        longitude: -99.1873,
      });
    });

    it('trims leading and trailing whitespace from valid provider label', () => {
      const payload = {
        label: '   Edificio de Posgrado   ',
        latitude: 20.0,
        longitude: -100.0,
      };

      const result = resolveIncidentLocation(payload, manualFallback);

      expect(result).toEqual<IncidentLocation>({
        source: 'provider',
        label: 'Edificio de Posgrado',
        latitude: 20.0,
        longitude: -100.0,
      });
    });
  });

  describe('resolveIncidentLocation - Boundary cases', () => {
    it('accepts exact latitude and longitude boundaries (-90, 90, -180, 180, 0)', () => {
      expect(
        resolveIncidentLocation({ label: 'Polo Norte', latitude: 90, longitude: 0 }, manualFallback),
      ).toEqual({ source: 'provider', label: 'Polo Norte', latitude: 90, longitude: 0 });

      expect(
        resolveIncidentLocation({ label: 'Polo Sur', latitude: -90, longitude: 0 }, manualFallback),
      ).toEqual({ source: 'provider', label: 'Polo Sur', latitude: -90, longitude: 0 });

      expect(
        resolveIncidentLocation({ label: 'Antimeridiano Este', latitude: 0, longitude: 180 }, manualFallback),
      ).toEqual({ source: 'provider', label: 'Antimeridiano Este', latitude: 0, longitude: 180 });

      expect(
        resolveIncidentLocation({ label: 'Antimeridiano Oeste', latitude: 0, longitude: -180 }, manualFallback),
      ).toEqual({ source: 'provider', label: 'Antimeridiano Oeste', latitude: 0, longitude: -180 });
    });

    it('falls back to manual when latitude or longitude is just beyond valid ranges', () => {
      expect(
        resolveIncidentLocation({ label: 'Fuera de rango norte', latitude: 90.0001, longitude: 0 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });

      expect(
        resolveIncidentLocation({ label: 'Fuera de rango sur', latitude: -90.0001, longitude: 0 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });

      expect(
        resolveIncidentLocation({ label: 'Fuera de rango este', latitude: 0, longitude: 180.0001 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });

      expect(
        resolveIncidentLocation({ label: 'Fuera de rango oeste', latitude: 0, longitude: -180.0001 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });
    });

    it('falls back to manual for non-finite numeric coordinates like NaN and Infinity', () => {
      expect(
        resolveIncidentLocation({ label: 'NaN coords', latitude: Number.NaN, longitude: 0 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });

      expect(
        resolveIncidentLocation({ label: 'Infinity coords', latitude: 0, longitude: Number.POSITIVE_INFINITY }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });
    });
  });

  describe('resolveIncidentLocation - Failure & Fallback cases', () => {
    it('returns manual location without coordinates for null, undefined, or primitives', () => {
      expect(resolveIncidentLocation(null, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation(undefined, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation(42, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation('random string', manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation([], manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });
    });

    it('returns manual location when provider returns an error payload such as status 429', () => {
      expect(resolveIncidentLocation({ status: 429 }, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation({ status: 503, error: 'Service Unavailable' }, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });
    });

    it('returns manual location when fields are incomplete, empty, or incorrectly typed', () => {
      expect(resolveIncidentLocation({ label: '' }, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation({ label: '   ' }, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(resolveIncidentLocation({ label: 'Incompleto' }, manualFallback)).toEqual({
        source: 'manual',
        label: manualFallback,
      });

      expect(
        resolveIncidentLocation({ label: 'Tipo string en lat', latitude: '19.4', longitude: -99.1 }, manualFallback),
      ).toEqual({ source: 'manual', label: manualFallback });
    });
  });

  describe('GeocodingCache - Resilient caching of external queries', () => {
    it('stores and retrieves cached locations by normalized query keys', () => {
      const cache = new GeocodingCache();
      const location: IncidentLocation = {
        source: 'provider',
        label: 'Edificio Central',
        latitude: 19.4,
        longitude: -99.1,
      };

      cache.set('Edificio Central', location);

      expect(cache.get('edificio central')).toEqual(location);
      expect(cache.get('  EDIFICIO CENTRAL  ')).toEqual(location);
      expect(cache.has('Edificio Central')).toBe(true);
    });

    it('returns null on cache miss', () => {
      const cache = new GeocodingCache();
      expect(cache.get('desconocido')).toBeNull();
      expect(cache.has('desconocido')).toBe(false);
    });

    it('expires cached entries after TTL', () => {
      const cache = new GeocodingCache({ defaultTtlMs: 1000 });
      const location: IncidentLocation = {
        source: 'provider',
        label: 'Cafetería',
        latitude: 19.5,
        longitude: -99.2,
      };

      const now = 10000;
      cache.set('cafeteria', location, 1000, now);

      expect(cache.get('cafeteria', now + 500)).toEqual(location);
      expect(cache.get('cafeteria', now + 1001)).toBeNull();
      expect(cache.has('cafeteria', now + 1001)).toBe(false);
    });

    it('bounds capacity and evicts oldest entry when maxEntries is exceeded', () => {
      const cache = new GeocodingCache({ maxEntries: 2 });
      const loc1: IncidentLocation = { source: 'provider', label: 'Loc 1', latitude: 1, longitude: 1 };
      const loc2: IncidentLocation = { source: 'provider', label: 'Loc 2', latitude: 2, longitude: 2 };
      const loc3: IncidentLocation = { source: 'provider', label: 'Loc 3', latitude: 3, longitude: 3 };

      cache.set('key1', loc1);
      cache.set('key2', loc2);
      expect(cache.size()).toBe(2);

      cache.set('key3', loc3);
      expect(cache.size()).toBe(2);
      expect(cache.get('key1')).toBeNull();
      expect(cache.get('key2')).toEqual(loc2);
      expect(cache.get('key3')).toEqual(loc3);
    });

    it('supports deleting specific entries and clearing the entire cache', () => {
      const cache = new GeocodingCache();
      const loc: IncidentLocation = { source: 'provider', label: 'Lab', latitude: 10, longitude: 10 };

      cache.set('lab', loc);
      expect(cache.size()).toBe(1);

      expect(cache.delete('lab')).toBe(true);
      expect(cache.size()).toBe(0);

      cache.set('lab2', loc);
      cache.clear();
      expect(cache.size()).toBe(0);
    });
  });
});
