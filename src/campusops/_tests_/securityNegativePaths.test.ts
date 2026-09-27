import { getBackendHealth } from '../../api/courseBackend';
import { toSafeError } from '../application/safeErrors';
import { ExpoSecureSessionStore, type SecureStoreClient } from '../infrastructure/ExpoSecureSessionStore';

const markers = {
  token: 'synthetic-token-value',
  authorization: 'Bearer synthetic-authorization-value',
  email: 'synthetic-user@campusops.test',
  comment: 'Comentario interno sintético',
  location: 'Zona sintética reservada',
  latitude: 12.345678,
  longitude: -98.765432,
  name: 'Persona sintética reservada',
  photo: 'synthetic-private-photo',
};

function sensitiveError() {
  return {
    code: 'forbidden', message: markers.token, stack: markers.comment,
    cause: { message: markers.location },
    token: markers.token, authorization: markers.authorization, email: markers.email,
    internalComments: [markers.comment], comentarioInterno: markers.comment,
    notes: [{ text: markers.comment }],
    user: { name: markers.name, email: markers.email },
    session: { accessToken: markers.token }, credentials: { value: markers.token },
    request: { headers: { authorization: markers.authorization } },
    response: { body: [{ location: markers.location, latitude: markers.latitude,
      longitude: markers.longitude, ubicacion: markers.location, photos: [markers.photo] }] },
  };
}

// Boolean assertions deliberately keep fixture values out of failure diagnostics.
function expectNoMarkers(value: unknown) {
  const serialized = JSON.stringify(value);
  expect(typeof serialized === 'string').toBe(true);
  for (const marker of Object.values(markers)) {
    expect(serialized?.includes(String(marker)) === false).toBe(true);
  }
}

function expectSafeShape(value: unknown) {
  expect(value !== null && typeof value === 'object').toBe(true);
  expect(JSON.stringify(Object.keys(value as object).sort()) === '["code","message"]').toBe(true);
  expectNoMarkers(value);
}

afterEach(() => jest.restoreAllMocks());

test('T5: token, authorization and email are excluded from safe errors', () => {
  const result = toSafeError(sensitiveError());
  expectSafeShape(result);
  expect(result.code === 'FORBIDDEN' && result.message === 'Acceso denegado.').toBe(true);
});

test('T3: internal comments and notes never enter the safe representation', () => {
  expectSafeShape(toSafeError({ internalComments: [markers.comment],
    comentarioInterno: markers.comment, notes: [{ text: markers.comment }] }));
});

test('T4: nested locations and coordinates never enter the safe representation', () => {
  expectSafeShape(toSafeError({ response: sensitiveError().response }));
});

test('T3/T4/T5: complete objects, arrays, stack and cause are discarded', () => {
  const input = sensitiveError();
  const result = toSafeError(input);
  expectSafeShape(result);
  expect(result === (input as unknown)).toBe(false);
  expectSafeShape(toSafeError([input, { nested: [input] }]));
});

test('T3/T4/T5: conversion preserves input and returns a fresh object each time', () => {
  const input = sensitiveError();
  const before: unknown = JSON.parse(JSON.stringify(input));
  const first = toSafeError(input);
  expect(JSON.stringify(input) === JSON.stringify(before)).toBe(true);
  expect(first === toSafeError(input)).toBe(false);
});

test('T5: unknown errors and hostile objects safely fall back without throwing', () => {
  const getter = jest.fn(() => { throw new Error(markers.token); });
  const accessor = Object.defineProperty({}, 'code', { get: getter });
  const proxy = Proxy.revocable({}, {});
  proxy.revoke();
  const cyclic: { self?: unknown } = {};
  cyclic.self = cyclic;
  for (const input of [new Error(markers.token), markers.email, null, undefined,
    { unexpected: markers.comment }, accessor, proxy.proxy, cyclic, { code: 'toString' }]) {
    const result = toSafeError(input);
    expectSafeShape(result);
    expect(result.code === 'INTERNAL_ERROR' && result.message === 'Ocurrió un error inesperado.').toBe(true);
  }
  expect(getter.mock.calls.length === 0).toBe(true);
});

test('T5: known backend codes map without carrying payload or version', () => {
  const cases = [
    ['unauthorized', 'UNAUTHORIZED', 'No autorizado.'],
    ['forbidden', 'FORBIDDEN', 'Acceso denegado.'],
    ['not_found', 'NOT_FOUND', 'Recurso no encontrado.'],
    ['invalid_request', 'INVALID_REQUEST', 'Solicitud inválida.'],
    ['invalid_contract', 'INVALID_REQUEST', 'Solicitud inválida.'],
    ['controlled_failure', 'INTERNAL_ERROR', 'Ocurrió un error inesperado.'],
    ['rate_limited', 'RATE_LIMITED', 'Demasiadas solicitudes.'],
    ['version_conflict', 'CONFLICT', 'Conflicto en la operación.'],
    ['transition_conflict', 'CONFLICT', 'Conflicto en la operación.'],
  ];
  for (const [code, expectedCode, message] of cases) {
    const result = toSafeError({ ...sensitiveError(), code, currentVersion: 42 });
    expectSafeShape(result);
    expect(result.code === expectedCode && result.message === message).toBe(true);
  }
});

async function rejectedHealth(): Promise<unknown> {
  try {
    await getBackendHealth('http://synthetic.invalid');
  } catch (error: unknown) {
    return error;
  }
  throw new Error('Expected health rejection');
}

test('T3/T4/T5: real HTTP boundary rejects safely into controlled diagnostics and report serialization', async () => {
  jest.spyOn(globalThis, 'fetch').mockRejectedValue(sensitiveError());
  const sinks = [jest.spyOn(console, 'log'), jest.spyOn(console, 'warn'), jest.spyOn(console, 'error')];
  sinks.forEach((sink) => sink.mockImplementation(() => undefined));
  const failure = await rejectedHealth();
  expectSafeShape(failure);
  // Controlled consumer only: this is not a production telemetry implementation.
  console.warn(JSON.stringify(failure));
  const diagnostics = sinks.flatMap((sink) => sink.mock.calls);
  expect(diagnostics.length === 1).toBe(true);
  expectNoMarkers(diagnostics);
  const report = JSON.stringify({ checks: [{ id: 'controlled-error', diagnostic: failure }] });
  expectNoMarkers(report);
  expect(report.includes('FORBIDDEN')).toBe(true);
});

test('T5: HTTP failures do not read bodies and malformed JSON remains a safe rejection', async () => {
  const json = jest.fn().mockRejectedValue(new Error(markers.token));
  const fetchMock = jest.spyOn(globalThis, 'fetch');
  fetchMock.mockResolvedValue({ ok: false, status: 401, json } as unknown as Response);
  const unauthorized = await rejectedHealth();
  expectSafeShape(unauthorized);
  expect((unauthorized as { code: string }).code === 'UNAUTHORIZED').toBe(true);
  expect(json.mock.calls.length === 0).toBe(true);
  fetchMock.mockResolvedValue({ ok: true, json } as unknown as Response);
  expectSafeShape(await rejectedHealth());
  json.mockResolvedValue({ ok: false, body: sensitiveError() });
  expectSafeShape(await rejectedHealth());
});

test('health success preserves the existing contract', async () => {
  const health = { ok: true, service: 'dmi-controlled-backend', contractVersion: 1 };
  jest.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: true,
    json: async () => health } as Response);
  expect(await getBackendHealth('http://synthetic.invalid') === health).toBe(true);
});

test('T3/T4/T5: protected storage keeps only minimal session fields', async () => {
  // No normal preferences store exists. This injected client checks the secure
  // adapter contract, not native encryption or device persistence.
  const client: jest.Mocked<SecureStoreClient> = {
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  };
  const store = new ExpoSecureSessionStore(client);
  await store.save({ ...sensitiveError(), accessToken: markers.token,
    refreshToken: 'synthetic-refresh-value', expiresAt: 1_800_000_000 });
  expect(client.setItemAsync.mock.calls.length === 1).toBe(true);
  const stored: unknown = JSON.parse(client.setItemAsync.mock.calls[0]![1]);
  expect(JSON.stringify(Object.keys(stored as object).sort()) ===
    '["accessToken","expiresAt","refreshToken"]').toBe(true);
  // Tokens belong in the protected session; other sensitive data does not.
  for (const key of ['comment', 'location', 'email', 'name', 'photo'] as const) {
    expect(JSON.stringify(stored).includes(markers[key])).toBe(false);
  }
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const error = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  client.getItemAsync.mockRejectedValue(sensitiveError());
  expect(await store.load() === null).toBe(true);
  expect(log.mock.calls.length + warn.mock.calls.length + error.mock.calls.length === 0).toBe(true);
});
