import type { SecureSessionStore } from '../application/ports/SecureSessionStore';
import { HttpIncidentRepository } from '../infrastructure/HttpIncidentRepository';
import { toSafeError } from '../application/safeErrors';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

beforeEach(() => { jest.spyOn(console, 'warn').mockImplementation(() => undefined); });
afterEach(() => { jest.restoreAllMocks(); jest.useRealTimers(); });

const resource = {
  id: 'campus-inc-001',
  version: 1,
  status: 'open',
  payload: {
    category: 'equipment',
    description: 'Equipo de prueba sin funcionar',
    location: 'Laboratorio ficticio',
  },
};

function jsonResponse(body: unknown, status = 200): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json: async () => body,
  } as Response;
}

function createRepository(timeoutMs = 8_000) {
  const sessionStore: SecureSessionStore = {
    load: async () => ({
      accessToken: 'course-valid-token',
      refreshToken: 'course-refresh-token',
      expiresAt: 4_102_444_800_000,
    }),
    save: async () => undefined,
    clear: async () => undefined,
  };
  const fetchImpl = jest.fn() as jest.MockedFunction<typeof fetch>;
  const repository = new HttpIncidentRepository({
    baseUrl: 'https://campusops.test/',
    sessionStore,
    getActorId: async () => 'reporter-1',
    fetchImpl,
    timeoutMs,
  });
  return { repository, fetchImpl, sessionStore };
}

test('lists and maps valid remote incidents', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse({ items: [resource] }));

  await expect(repository.list()).resolves.toEqual([{
    id: resource.id,
    title: resource.payload.description,
    description: resource.payload.description,
    status: 'open',
    category: 'equipment',
    location: resource.payload.location,
  }]);
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://campusops.test/v1/incidents',
    expect.objectContaining({
      method: 'GET',
      headers: expect.objectContaining({
        Authorization: 'Bearer course-valid-token',
        'X-Course-Actor': 'reporter-1',
      }),
    }),
  );
});

test('loads and maps the requested remote incident', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse(resource));

  await expect(repository.getById('campus-inc-001')).resolves.toMatchObject({
    id: 'campus-inc-001',
    description: 'Equipo de prueba sin funcionar',
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://campusops.test/v1/incidents/campus-inc-001',
    expect.objectContaining({ method: 'GET' }),
  );
});

test('creates an incident with actor, authorization and idempotency headers', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse({ incident: resource, operationId: 'operation-key-001', duplicate: false }, 201));
  const input = {
    category: 'equipment' as const,
    description: 'Equipo de prueba sin funcionar',
    location: 'Laboratorio ficticio',
  };

  await expect(repository.create(input, 'operation-key-001')).resolves.toMatchObject({
    id: 'campus-inc-001',
    category: 'equipment',
  });
  expect(fetchImpl).toHaveBeenCalledWith(
    'https://campusops.test/v1/incidents',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify(input),
      headers: expect.objectContaining({
        Authorization: 'Bearer course-valid-token',
        'X-Course-Actor': 'reporter-1',
        'Idempotency-Key': 'operation-key-001',
      }),
    }),
  );
});

test('creation distinguishes absent payload from a malformed contract without inventing an incident', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse({ incident: { ...resource, payload: null }, operationId: 'operation-key-002', duplicate: false }));

  await expect(repository.create({
    category: 'equipment', description: 'Descripción', location: 'Ubicación',
  }, 'operation-key-002')).rejects.toMatchObject({ kind: 'absent' });
});

const input = { category: 'equipment' as const, description: 'Synthetic description', location: 'Synthetic location' };
const operationKey = 'operation-key-003';
const operations = ['list', 'detail', 'create'] as const;
type Operation = typeof operations[number];
function invoke(repository: HttpIncidentRepository, operation: Operation) {
  if (operation === 'list') return repository.list();
  if (operation === 'detail') return repository.getById(resource.id);
  return repository.create(input, operationKey);
}
function envelope(operation: Operation, dto: unknown): unknown {
  if (operation === 'list') return { items: [dto] };
  if (operation === 'detail') return dto;
  return { incident: dto, operationId: operationKey, duplicate: false };
}

test('empty list is valid and null payloads are omitted without hiding malformed items', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValueOnce(jsonResponse({ items: [] }))
    .mockResolvedValueOnce(jsonResponse({ items: [{ ...resource, payload: null }] }))
    .mockResolvedValueOnce(jsonResponse({ items: [{ ...resource, payload: null }, resource] }))
    .mockResolvedValueOnce(jsonResponse({ items: [{ ...resource, payload: null }, { ...resource, id: '' }] }));
  await expect(repository.list()).resolves.toEqual([]);
  await expect(repository.list()).resolves.toEqual([]);
  await expect(repository.list()).resolves.toHaveLength(1);
  await expect(repository.list()).rejects.toMatchObject({ kind: 'contract', reason: 'schema' });
});

test('detail preserves null payload and HTTP 404 as absence using the existing port', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValueOnce(jsonResponse({ ...resource, payload: null }))
    .mockResolvedValueOnce(jsonResponse(null, 404));
  await expect(repository.getById('a/b')).resolves.toBeNull();
  expect(fetchImpl.mock.calls[0]?.[0]).toBe('https://campusops.test/v1/incidents/a%2Fb');
  await expect(repository.getById('missing')).resolves.toBeNull();
});

test.each(operations)('%s maps DTO to fresh domain data without mutation or remote metadata', async (operation) => {
  const { repository, fetchImpl } = createRepository();
  const dto = { ...resource, payload: { ...resource.payload, internalComments: ['synthetic-note'] }, future: true };
  const before = JSON.stringify(dto);
  fetchImpl.mockResolvedValue(jsonResponse(envelope(operation, dto)));
  const result = await invoke(repository, operation);
  const incident = Array.isArray(result) ? result[0] : result;
  expect(incident).toEqual({ id: resource.id, title: resource.payload.description, ...resource.payload, status: 'open' });
  expect(incident).not.toBe(dto);
  expect(JSON.stringify(dto)).toBe(before);
});

const malformed = [
  { ...resource, id: '' }, { ...resource, version: -1 }, { ...resource, version: '1' },
  { ...resource, payload: [] }, { ...resource, payload: {} },
  { ...resource, status: 'invalid' }, { ...resource, payload: { ...resource.payload, category: 'invalid' } },
  { ...resource, payload: { ...resource.payload, description: ' ' } },
  { ...resource, payload: { ...resource.payload, location: null } },
];
describe.each(operations)('%s contract validation', (operation) => {
  test.each(malformed)('rejects malformed contract %# separately from malformed JSON', async (dto) => {
    const { repository, fetchImpl } = createRepository();
    fetchImpl.mockResolvedValue(jsonResponse(envelope(operation, dto)));
    await expect(invoke(repository, operation)).rejects.toMatchObject({ kind: 'contract', reason: 'schema' });
  });
});

test.each([null, [], {}, { items: null }, { items: {} }])('rejects malformed list wrapper %#', async (body) => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse(body));
  await expect(repository.list()).rejects.toMatchObject({ kind: 'contract', reason: 'schema' });
});

test.each([null, {}, { incident: resource },
  { incident: resource, operationId: '', duplicate: false },
  { incident: resource, operationId: operationKey, duplicate: 'false' },
])('validates creation metadata %#', async (body) => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse(body));
  await expect(repository.create(input, operationKey)).rejects.toMatchObject({ kind: 'contract', reason: 'schema' });
});

test('accepts a successful duplicate creation response without exposing remote metadata', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse({ incident: resource, operationId: operationKey, duplicate: true }));
  await expect(repository.create(input, operationKey)).resolves.toMatchObject({ id: resource.id });
});

const markers = {
  Authorization: 'SYNTHETIC_AUTH_MARKER', token: 'SYNTHETIC_TOKEN_MARKER', email: 'synthetic@example.invalid',
  location: 'SYNTHETIC_LOCATION_MARKER', coordinates: 'SYNTHETIC_COORDINATES_MARKER',
  internalComments: 'SYNTHETIC_COMMENTS_MARKER', stack: 'SYNTHETIC_STACK_MARKER', cause: 'SYNTHETIC_CAUSE_MARKER',
};
function unsafeError(name = 'Error') {
  return Object.assign(new Error(JSON.stringify(markers)), markers, { name });
}
function assertSafe(failure: unknown) {
  expect(failure).not.toBeInstanceOf(Error);
  expect(failure).not.toHaveProperty('stack');
  expect(failure).not.toHaveProperty('cause');
  const serialized = JSON.stringify({ failure, safe: toSafeError(failure), diagnostics: jest.mocked(console.warn).mock.calls });
  for (const marker of Object.values(markers)) expect(serialized).not.toContain(marker);
  expect(console.warn).toHaveBeenCalledWith('CampusOps telemetry', expect.objectContaining({
    event: 'incident_request_failed', context: expect.objectContaining({ error: expect.objectContaining({ message: '[REDACTED]' }) }),
  }));
}

describe.each(operations)('%s failure discrimination and sanitization', (operation) => {
  test('malformed JSON is contract/json without exposing SyntaxError or response content', async () => {
    const { repository, fetchImpl } = createRepository();
    fetchImpl.mockResolvedValue({ ...jsonResponse(null), json: async () => { throw Object.assign(new SyntaxError(JSON.stringify(markers)), markers); } });
    const result = await invoke(repository, operation).catch((error: unknown) => error);
    expect(result).toMatchObject({ kind: 'contract', reason: 'json' });
    assertSafe(result);
  });

  test('HTTP 500 keeps only safe status and never reads the response body', async () => {
    const { repository, fetchImpl } = createRepository();
    const json = jest.fn(async () => markers);
    fetchImpl.mockResolvedValue({ ...jsonResponse(null, 500), json });
    const result = await invoke(repository, operation).catch((error: unknown) => error);
    expect(result).toEqual({ kind: 'http', status: 500, ...toSafeError(null) });
    expect(json).not.toHaveBeenCalled();
    assertSafe(result);
  });

  test.each(['Error', 'AbortError'])('network rejection %s without internal timeout stays network and safe', async (name) => {
    const { repository, fetchImpl } = createRepository();
    fetchImpl.mockRejectedValue(unsafeError(name));
    const result = await invoke(repository, operation).catch((error: unknown) => error);
    expect(result).toMatchObject({ kind: 'network', code: 'NETWORK_ERROR' });
    assertSafe(result);
  });

  test('internal timeout aborts fetch, is distinct from network and clears its timer', async () => {
    jest.useFakeTimers();
    const { repository, fetchImpl } = createRepository(5);
    let signal: AbortSignal | null | undefined;
    fetchImpl.mockImplementation((_url, init) => new Promise((_resolve, reject) => {
      signal = init?.signal;
      signal?.addEventListener('abort', () => reject(unsafeError('AbortError')), { once: true });
    }));
    const pending = invoke(repository, operation).catch((error: unknown) => error);
    await jest.advanceTimersByTimeAsync(5);
    const result = await pending;
    expect(signal?.aborted).toBe(true);
    expect(result).toMatchObject({ kind: 'timeout' });
    expect(jest.getTimerCount()).toBe(0);
    assertSafe(result);
  });

  test('malformed domain with sensitive data produces only a safe contract error', async () => {
    const { repository, fetchImpl } = createRepository();
    fetchImpl.mockResolvedValue(jsonResponse(envelope(operation, { ...resource, payload: markers })));
    const result = await invoke(repository, operation).catch((error: unknown) => error);
    expect(result).toMatchObject({ kind: 'contract', reason: 'schema' });
    assertSafe(result);
  });
});

test('timeout also controls body decoding after response headers arrive', async () => {
  jest.useFakeTimers();
  const { repository, fetchImpl } = createRepository(5);
  fetchImpl.mockImplementation(async (_url, init) => ({ ...jsonResponse(null),
    json: () => new Promise((_resolve, reject) => {
      init?.signal?.addEventListener('abort', () => reject(unsafeError('AbortError')), { once: true });
    }),
  }));
  const pending = repository.list().catch((error: unknown) => error);
  await jest.advanceTimersByTimeAsync(5);
  expect(await pending).toMatchObject({ kind: 'timeout' });
  expect(jest.getTimerCount()).toBe(0);
});

test('session provider failures are sanitized before leaving the client', async () => {
  const { repository, fetchImpl, sessionStore } = createRepository();
  sessionStore.load = async () => { throw unsafeError(); };
  const result = await repository.list().catch((error: unknown) => error);
  expect(result).toMatchObject({ kind: 'precondition' });
  expect(fetchImpl).not.toHaveBeenCalled();
  assertSafe(result);
});

test('UI source files contain no direct fetch calls', () => {
  function inspect(directory: string): void {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const path = join(directory, entry.name);
      if (entry.isDirectory()) inspect(path);
      else if (/\.tsx?$/.test(entry.name)) expect(readFileSync(path, 'utf8')).not.toMatch(/\bfetch\s*\(/);
    }
  }
  inspect(join(process.cwd(), 'src/campusops/ui'));
});
