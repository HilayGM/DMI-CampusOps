import type { IncidentLocation } from '../contracts';

/**
 * Resolves an incident location given a candidate provider payload and a manual fallback label.
 *
 * Conforms to Week 09 contract in docs/CAMPUSOPS_API.md:
 * - Accepts only an object with a non-empty string label and finite numeric coordinates
 *   within latitude [-90, 90] and longitude [-180, 180].
 * - Returns { source: 'provider', label, latitude, longitude }.
 * - For null, error payloads (e.g. status: 429), incomplete data, invalid coordinates,
 *   or incorrect types, returns { source: 'manual', label: manualFallbackLabel } without coordinates.
 */
export function resolveIncidentLocation(
  provider: unknown,
  manualFallbackLabel: string,
): IncidentLocation {
  const fallback: IncidentLocation = {
    source: 'manual',
    label: manualFallbackLabel,
  };

  if (!provider || typeof provider !== 'object' || Array.isArray(provider)) {
    return fallback;
  }

  const record = provider as Record<string, unknown>;

  // Check for HTTP error representations (e.g. { status: 429 })
  if (
    'status' in record &&
    typeof record.status === 'number' &&
    record.status >= 400
  ) {
    return fallback;
  }

  // Label must be a non-empty string
  if (typeof record.label !== 'string' || record.label.trim().length === 0) {
    return fallback;
  }

  // Latitude must be a finite number within [-90, 90]
  if (
    typeof record.latitude !== 'number' ||
    !Number.isFinite(record.latitude) ||
    record.latitude < -90 ||
    record.latitude > 90
  ) {
    return fallback;
  }

  // Longitude must be a finite number within [-180, 180]
  if (
    typeof record.longitude !== 'number' ||
    !Number.isFinite(record.longitude) ||
    record.longitude < -180 ||
    record.longitude > 180
  ) {
    return fallback;
  }

  return {
    source: 'provider',
    label: record.label.trim(),
    latitude: record.latitude,
    longitude: record.longitude,
  };
}
