import { SessionService } from '../application/SessionService';
import type { SecureSessionStore, StoredSession } from '../application/ports/SecureSessionStore';
import { HttpIncidentRepository } from '../infrastructure/HttpIncidentRepository';

function response(body: unknown, status = 200, json: () => Promise<unknown> = async () => body): Response {
  return {
    ok: status >= 200 && status < 300,
    status,
    json,
  } as Response;
}

function createFetchMock(): jest.MockedFunction<typeof fetch> {
  return jest.fn() as jest.MockedFunction<typeof fetch>;
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((done, fail) => {
    resolve = done;
    reject = fail;
  });
  return { promise, resolve, reject };
}

const persistedSession: StoredSession = {
  actorId: 'technician-1',
  accessToken: 'synthetic-access-old',
  refreshToken: 'synthetic-refresh-old',
  expiresAt: 100_000,
};

class MemorySessionStore implements SecureSessionStore {
  value: StoredSession | null;
  clearError: unknown = null;

  constructor(value: StoredSession | null = null) {
    this.value = value;
  }

  async load() {
    return this.value;
  }

  async save(session: StoredSession) {
    this.value = { ...session };
  }

  async clear() {
    if (this.clearError) throw this.clearError;
    this.value = null;
  }
}

function createService(
  fetchImpl: jest.MockedFunction<typeof fetch>,
  store = new MemorySessionStore(),
  now = 1_000,
) {
  let currentTime = now;
  const service = new SessionService({
    baseUrl: 'https://campusops.test',
    sessionStore: store,
    fetchImpl,
    clock: { now: () => currentTime },
  });
  return {
    service,
    store,
    setNow(value: number) {
      currentTime = value;
    },
  };
}

function sessionFetch(
  service: SessionService,
) {
  return new HttpIncidentRepository({
    baseUrl: 'https://campusops.test',
    session: service,
  });
}

test('logs in through the backend, validates the response and persists only required session fields', async () => {
  const fetchImpl = createFetchMock().mockResolvedValue(response({
    actorId: 'technician-1',
    role: 'technician',
    accessToken: 'synthetic-access-login',
    refreshToken: 'synthetic-refresh-login',
    expiresIn: 60,
  }));
  const { service, store } = createService(fetchImpl);

  await service.login('technician-1');

  expect(fetchImpl).toHaveBeenCalledWith(
    'https://campusops.test/v1/session/login',
    expect.objectContaining({
      method: 'POST',
      body: JSON.stringify({ actorId: 'technician-1' }),
    }),
  );
  expect(store.value).toEqual({
    actorId: 'technician-1',
    accessToken: 'synthetic-access-login',
    refreshToken: 'synthetic-refresh-login',
    expiresAt: 61_000,
  });
  expect(Object.keys(store.value ?? {}).sort()).toEqual([
    'accessToken', 'actorId', 'expiresAt', 'refreshToken',
  ]);
});

test.each([
  ['actor rejected', response({ code: 'unknown_fixture_actor' }, 401)],
  ['malformed response', response({ actorId: 'technician-1', role: 'technician', accessToken: '', refreshToken: 'synthetic-refresh', expiresIn: 60 })],
  ['invalid JSON', response(null, 200, async () => { throw new Error('synthetic-access-secret'); })],
])('login %s does not persist a session or expose response secrets', async (_name, loginResponse) => {
  const fetchImpl = createFetchMock().mockResolvedValue(loginResponse);
  const { service, store } = createService(fetchImpl);
  const log = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  const errorLog = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const failure = await service.login('technician-1').catch((error: unknown) => error);

  expect(failure).toMatchObject({ message: expect.any(String) });
  expect(JSON.stringify(failure)).not.toContain('synthetic-access-secret');
  expect(JSON.stringify([log.mock.calls, warn.mock.calls, errorLog.mock.calls])).not.toContain('synthetic-');
  expect(store.value).toBeNull();
});

test.each([
  ['before expiry', 999, 0],
  ['at expiry', 1_000, 1],
  ['after expiry', 1_001, 1],
])('restores a session %s using the injected clock', async (
  _name: string,
  now: number,
  refreshCount: number,
) => {
  const store = new MemorySessionStore({ ...persistedSession, expiresAt: 1_000 });
  const fetchImpl = createFetchMock().mockResolvedValue(response({
    accessToken: 'synthetic-access-new',
    refreshToken: 'synthetic-refresh-new',
    expiresIn: 60,
  }));
  const { service } = createService(fetchImpl, store, now);

  await expect(service.restore()).resolves.toBe(true);
  expect(fetchImpl).toHaveBeenCalledTimes(refreshCount);
  if (refreshCount) {
    expect(fetchImpl).toHaveBeenCalledWith(
      'https://campusops.test/v1/session/refresh',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({ refreshToken: persistedSession.refreshToken }),
      }),
    );
  }
});

test('shares one HTTP refresh across three concurrent protected requests and retries each once', async () => {
  const initialRequests = [deferred<Response>(), deferred<Response>(), deferred<Response>()];
  const refreshResponse = deferred<Response>();
  const allInitialRequestsStarted = deferred<void>();
  const refreshStarted = deferred<void>();
  let incidentCalls = 0;
  const fetchImpl = createFetchMock().mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/v1/session/refresh')) {
      refreshStarted.resolve();
      return refreshResponse.promise;
    }
    incidentCalls += 1;
    if (incidentCalls <= 3) {
      if (incidentCalls === 3) allInitialRequestsStarted.resolve();
      return initialRequests[incidentCalls - 1]!.promise;
    }
    return Promise.resolve(response({ items: [] }));
  });
  const { service, store } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  const repository = sessionFetch(service);
  await service.restore();

  const pending = [repository.list(), repository.list(), repository.list()];
  await allInitialRequestsStarted.promise;
  initialRequests.forEach((request) => request.resolve(response({ code: 'unauthorized' }, 401)));
  await refreshStarted.promise;

  expect(fetchImpl.mock.calls.filter(([input]) => String(input).endsWith('/v1/session/refresh'))).toHaveLength(1);
  refreshResponse.resolve(response({
    accessToken: 'synthetic-access-new',
    refreshToken: 'synthetic-refresh-new',
    expiresIn: 60,
  }));
  await expect(Promise.all(pending)).resolves.toEqual([[], [], []]);

  expect(incidentCalls).toBe(6);
  expect(store.value?.accessToken).toBe('synthetic-access-new');
  const incidentCallsWithHeaders = fetchImpl.mock.calls.filter(([input]) => String(input).includes('/v1/incidents'));
  expect(incidentCallsWithHeaders).toHaveLength(6);
  expect(incidentCallsWithHeaders.slice(3).every(([, init]) => (
    new Headers(init?.headers).get('Authorization') === 'Bearer synthetic-access-new'
  ))).toBe(true);
});

test('does not refresh again when a retried request receives 401', async () => {
  const fetchImpl = createFetchMock()
    .mockResolvedValueOnce(response({ code: 'unauthorized' }, 401))
    .mockResolvedValueOnce(response({ accessToken: 'synthetic-access-new', refreshToken: 'synthetic-refresh-new', expiresIn: 60 }))
    .mockResolvedValueOnce(response({ code: 'unauthorized' }, 401));
  const { service } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  const repository = sessionFetch(service);
  await service.restore();

  await expect(repository.list()).rejects.toMatchObject({ kind: 'http', status: 401 });
  expect(fetchImpl.mock.calls.filter(([input]) => String(input).endsWith('/v1/session/refresh'))).toHaveLength(1);
  expect(fetchImpl.mock.calls.filter(([input]) => String(input).includes('/v1/incidents'))).toHaveLength(2);
});

test.each([
  ['401 response', response({ code: 'invalid_grant' }, 401)],
  ['invalid JSON', response(null, 200, async () => { throw new Error('synthetic-refresh-secret'); })],
  ['malformed response', response({ accessToken: '', refreshToken: 'synthetic-refresh-new', expiresIn: 60 })],
])('clears the session after refresh failure: %s', async (_name, refreshResponse) => {
  const fetchImpl = createFetchMock()
    .mockResolvedValueOnce(response({ code: 'unauthorized' }, 401))
    .mockResolvedValueOnce(refreshResponse);
  const { service, store } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  await service.restore();

  const failure = await service.fetchProtected('https://campusops.test/v1/incidents').catch((error: unknown) => error);
  expect(failure).toMatchObject({ message: expect.any(String) });
  expect(JSON.stringify(failure)).not.toContain('synthetic-refresh-secret');
  expect(store.value).toBeNull();
  await expect(service.fetchProtected('https://campusops.test/v1/incidents'))
    .rejects.toMatchObject({ kind: 'precondition' });
});

test('clears network failures safely and prevents a late refresh from restoring logout', async () => {
  const refreshResponse = deferred<Response>();
  const refreshStarted = deferred<void>();
  const fetchImpl = createFetchMock().mockImplementation((input) => {
    if (String(input).endsWith('/v1/session/refresh')) {
      refreshStarted.resolve();
      return refreshResponse.promise;
    }
    return Promise.resolve(response({ code: 'unauthorized' }, 401));
  });
  const { service, store } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  await service.restore();

  const protectedRequest = service.fetchProtected('https://campusops.test/v1/incidents')
    .catch((error: unknown) => error);
  await refreshStarted.promise;
  await service.logout();
  refreshResponse.resolve(response({
    accessToken: 'synthetic-access-late',
    refreshToken: 'synthetic-refresh-late',
    expiresIn: 60,
  }));

  const failure = await protectedRequest;
  expect(failure).toMatchObject({ kind: 'http', status: 401 });
  expect(store.value).toBeNull();
  await expect(service.fetchProtected('https://campusops.test/v1/incidents'))
    .rejects.toMatchObject({ kind: 'precondition' });
});

test('clears the persisted session after a network failure during refresh', async () => {
  const fetchImpl = createFetchMock()
    .mockResolvedValueOnce(response({ code: 'unauthorized' }, 401))
    .mockRejectedValueOnce(new Error('synthetic-refresh-secret'));
  const { service, store } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  await service.restore();

  const failure = await service.fetchProtected('https://campusops.test/v1/incidents')
    .catch((error: unknown) => error);

  expect(failure).toMatchObject({ kind: 'network' });
  expect(JSON.stringify(failure)).not.toContain('synthetic-refresh-secret');
  expect(store.value).toBeNull();
});

test('serializes logout after an in-progress secure refresh write so stale tokens are cleared last', async () => {
  const refreshWriteStarted = deferred<void>();
  const finishRefreshWrite = deferred<void>();
  const refreshResponse = response({
    accessToken: 'synthetic-access-refreshing',
    refreshToken: 'synthetic-refresh-refreshing',
    expiresIn: 60,
  });
  const store = new MemorySessionStore(persistedSession);
  const originalSave = store.save.bind(store);
  store.save = async (session) => {
    if (session.accessToken === 'synthetic-access-refreshing') {
      refreshWriteStarted.resolve();
      await finishRefreshWrite.promise;
    }
    await originalSave(session);
  };
  const fetchImpl = createFetchMock()
    .mockResolvedValueOnce(response({ code: 'unauthorized' }, 401))
    .mockResolvedValueOnce(refreshResponse);
  const { service } = createService(fetchImpl, store);
  await service.restore();

  const protectedRequest = service.fetchProtected('https://campusops.test/v1/incidents')
    .catch((error: unknown) => error);
  await refreshWriteStarted.promise;
  const logout = service.logout();
  finishRefreshWrite.resolve();
  await logout;

  expect(await protectedRequest).toMatchObject({ kind: 'http', status: 401 });
  expect(store.value).toBeNull();
});

test('a newer login is not overwritten by an obsolete refresh result', async () => {
  const refreshResponse = deferred<Response>();
  const refreshStarted = deferred<void>();
  const fetchImpl = createFetchMock().mockImplementation((input) => {
    const url = String(input);
    if (url.endsWith('/v1/session/refresh')) {
      refreshStarted.resolve();
      return refreshResponse.promise;
    }
    if (url.endsWith('/v1/session/login')) {
      return Promise.resolve(response({
        actorId: 'reporter-1',
        role: 'reporter',
        accessToken: 'synthetic-access-latest',
        refreshToken: 'synthetic-refresh-latest',
        expiresIn: 60,
      }));
    }
    return Promise.resolve(response({ code: 'unauthorized' }, 401));
  });
  const { service, store } = createService(fetchImpl, new MemorySessionStore(persistedSession));
  await service.restore();
  const staleRequest = service.fetchProtected('https://campusops.test/v1/incidents')
    .catch((error: unknown) => error);
  await refreshStarted.promise;

  await service.login('reporter-1');
  refreshResponse.resolve(response({
    accessToken: 'synthetic-access-obsolete',
    refreshToken: 'synthetic-refresh-obsolete',
    expiresIn: 60,
  }));

  await staleRequest;
  expect(store.value?.actorId).toBe('reporter-1');
  expect(store.value?.accessToken).toBe('synthetic-access-latest');
});

test('surfaces secure-store logout failures without leaking storage errors', async () => {
  const fetchImpl = createFetchMock();
  const store = new MemorySessionStore(persistedSession);
  store.clearError = new Error('synthetic-access-secret');
  const { service } = createService(fetchImpl, store);

  const failure = await service.logout().catch((error: unknown) => error);
  expect(failure).toMatchObject({ kind: 'precondition' });
  expect(JSON.stringify(failure)).not.toContain('synthetic-access-secret');
  expect(fetchImpl).not.toHaveBeenCalled();
});
