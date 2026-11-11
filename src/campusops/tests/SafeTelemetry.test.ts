import { redactForTelemetry } from '../infrastructure/SafeTelemetry';

const REDACTED = '[REDACTED]';

describe('redactForTelemetry', () => {
  test('conserves the five technical identifiers and incidentId', () => {
    expect(redactForTelemetry({
      correlationId: 'corr-001', requestId: 'req-001', status: 'failed', attempt: 2, durationMs: 125,
      incidentId: 'incident-001',
    })).toEqual({
      correlationId: 'corr-001', requestId: 'req-001', status: 'failed', attempt: 2, durationMs: 125,
      incidentId: 'incident-001',
    });
  });

  test('redacts tokens, passwords, API keys, secrets, names and emails', () => {
    expect(redactForTelemetry({
      accessToken: 'synthetic-access-token', password: 'synthetic-password', api_key: 'synthetic-api-key',
      clientSecret: 'synthetic-secret', nombre: 'Persona Ficticia', email: 'person@example.invalid',
    })).toEqual({
      accessToken: REDACTED, password: REDACTED, api_key: REDACTED,
      clientSecret: REDACTED, nombre: REDACTED, email: REDACTED,
    });
  });

  test('redacts location, coordinates, photographs, evidence and internal comments', () => {
    expect(redactForTelemetry({
      location: 'Campus Ficticio', latitude: 19.4326, longitude: -99.1332,
      photos: ['synthetic-photo'], evidence: { photograph: 'synthetic-image' },
      internal_comments: 'Nota privada ficticia', diagnosis: 'Diagnóstico privado ficticio',
    })).toEqual({
      location: REDACTED, latitude: REDACTED, longitude: REDACTED,
      photos: REDACTED, evidence: REDACTED, internal_comments: REDACTED, diagnosis: REDACTED,
    });
  });

  test('sanitizes nested objects and arrays while preserving their safe shape', () => {
    expect(redactForTelemetry({
      events: [{ request_id: 'req-002', token: 'synthetic-token', nested: { status: 'ok', name: 'Ficticio' } }],
    })).toEqual({
      events: [{ request_id: 'req-002', token: REDACTED, nested: { status: 'ok', name: REDACTED } }],
    });
  });

  test('normalizes casing, separators and accents', () => {
    expect(redactForTelemetry({
      ACCESS_TOKEN: 'synthetic-token', 'api-key': 'synthetic-key', 'NOMBRE': 'Ficticio',
      'comentários-internos': 'Privado',
    })).toEqual({
      ACCESS_TOKEN: REDACTED, 'api-key': REDACTED, 'NOMBRE': REDACTED,
      'comentários-internos': REDACTED,
    });
  });

  test('redacts free text and preserves only known safe error codes', () => {
    expect(redactForTelemetry({ error: 'timeout', details: 'token=synthetic-token', arbitrary: 42 })).toEqual({
      error: 'timeout', details: REDACTED, arbitrary: REDACTED,
    });
    expect(redactForTelemetry({ error: 'private diagnostic with synthetic token' })).toEqual({ error: REDACTED });
  });

  test('does not mutate input and handles null and unexpected values', () => {
    const input = { status: 'ok', sensitive: { password: 'synthetic-password' }, nil: null };
    const before = JSON.stringify(input);
    expect(redactForTelemetry(input)).toEqual({ status: 'ok', sensitive: { password: REDACTED }, nil: null });
    expect(JSON.stringify(input)).toBe(before);
    expect(redactForTelemetry(null)).toBeNull();
    expect(redactForTelemetry(undefined)).toBeUndefined();
    expect(redactForTelemetry('free text')).toBe(REDACTED);
  });

  test('handles circular references without exposing nested sensitive values', () => {
    const input: { status: string; self?: unknown; password: string } = {
      status: 'ok', password: 'synthetic-password',
    };
    input.self = input;
    const result = redactForTelemetry(input) as typeof input;
    expect(result.status).toBe('ok');
    expect(result.password).toBe(REDACTED);
    expect(result.self).toBe(result);
  });

  test('does not execute accessors while sanitizing problematic objects', () => {
    const getter = jest.fn(() => 'should-not-run');
    const input = {} as { dangerous: string };
    Object.defineProperty(input, 'dangerous', { enumerable: true, get: getter });
    expect(redactForTelemetry(input)).toEqual({ dangerous: REDACTED });
    expect(getter).not.toHaveBeenCalled();
  });
});
