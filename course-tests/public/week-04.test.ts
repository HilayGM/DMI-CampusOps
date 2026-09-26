import { redactForTelemetry } from '../../src/course-evaluation';

test('CampusOps redacts personal and incident-sensitive data while preserving technical context', () => {
  const result = redactForTelemetry({
    request: { headers: { authorization: 'Bearer course-token', accept: 'application/json' } },
    profile: { email: 'person@campusops.test', displayName: 'Persona ficticia' },
    incidentId: 'campus-inc-001',
    location: 'Zona ficticia',
    photos: ['synthetic-photo-1'],
    internalComments: ['Nota interna ficticia'],
  });
  expect(result).toEqual({
    request: { headers: { authorization: '[REDACTED]', accept: 'application/json' } },
    profile: { email: '[REDACTED]', displayName: '[REDACTED]' },
    incidentId: 'campus-inc-001',
    location: '[REDACTED]',
    photos: '[REDACTED]',
    internalComments: '[REDACTED]',
  });
});

test('CampusOps sanitizes nested records in arrays without mutating the original', () => {
  const input = {
    incidentId: 'campus-inc-002',
    status: 'in_progress',
    attempt: 2,
    durationMs: 125,
    events: [
      { authorization: 'Bearer private-token', email: 'person@campusops.test' },
      { nested: [{ nombre: 'Persona ficticia', comentariosInternos: 'Nota privada' }] },
    ],
  };

  const result = redactForTelemetry(input);

  expect(result).toEqual({
    incidentId: 'campus-inc-002',
    status: 'in_progress',
    attempt: 2,
    durationMs: 125,
    events: [
      { authorization: '[REDACTED]', email: '[REDACTED]' },
      { nested: [{ nombre: '[REDACTED]', comentariosInternos: '[REDACTED]' }] },
    ],
  });
  expect(input.events[0]?.authorization).toBe('Bearer private-token');
  expect(input.events[1]).toMatchObject({ nested: [{ nombre: 'Persona ficticia' }] });
  expect(result).not.toBe(input);
  expect((result as typeof input).events).not.toBe(input.events);
  expect((result as typeof input).events[0]).not.toBe(input.events[0]);
});
