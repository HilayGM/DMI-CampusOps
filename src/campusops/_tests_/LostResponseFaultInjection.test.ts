import { HttpIncidentRepository } from '../infrastructure/HttpIncidentRepository';
import { planRetry } from '../../course-evaluation';
import type { SecureSessionStore } from '../application/ports/SecureSessionStore';

describe('Week 09 — Fault Injection & Lost Response Resilience', () => {
  beforeEach(() => {
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  const baseIncident = {
    id: 'campus-inc-001',
    version: 3,
    status: 'in_progress',
    payload: {
      category: 'equipment',
      description: 'Equipo de laboratorio con fallo de sensor',
      location: 'Laboratorio de Electrónica - Edificio B',
      assignedTechnicianId: 'technician-1',
      reporterId: 'reporter-1',
      priority: 'high',
      notes: [],
      evidence: [],
      history: [
        { operationId: 'op-create', actorId: 'reporter-1', action: 'create', version: 1 },
        { operationId: 'op-assign', actorId: 'coordinator-1', action: 'assign', version: 2 },
        { operationId: 'op-start', actorId: 'technician-1', action: 'start', version: 3 },
      ],
    },
  };

  function createTestRepository(fetchMock: jest.Mock, timeoutMs = 50) {
    const sessionStore: SecureSessionStore = {
      load: async () => ({
        actorId: 'technician-1',
        accessToken: 'course-valid-token',
        refreshToken: 'course-refresh-token',
        expiresAt: Date.now() + 3_600_000,
      }),
      save: async () => undefined,
      clear: async () => undefined,
    };

    const session = {
      fetchProtected: async (input: RequestInfo | URL, init: RequestInit = {}) => {
        const stored = await sessionStore.load();
        const headers = {
          ...(init.headers as Record<string, string>),
          Authorization: `Bearer ${stored?.accessToken ?? ''}`,
          'X-Course-Actor': stored?.actorId ?? '',
        };
        return fetchMock(input, { ...init, headers });
      },
    };

    const repository = new HttpIncidentRepository({
      baseUrl: 'https://campusops.test',
      session,
      timeoutMs,
    });

    return { repository, sessionStore };
  }

  it('nominal: executes resolution with stable idempotency key and commits state', async () => {
    const committedIncident = {
      ...baseIncident,
      version: 4,
      status: 'resolved',
      payload: {
        ...baseIncident.payload,
        diagnosis: 'Sensor sustituido y calibrado correctamente',
        history: [
          ...baseIncident.payload.history,
          { operationId: 'resolve-key-001', actorId: 'technician-1', action: 'resolve', version: 4 },
        ],
      },
    };

    const fetchMock = jest.fn().mockResolvedValueOnce({
      ok: true,
      status: 201,
      json: async () => ({
        incident: committedIncident,
        operationId: 'resolve-key-001',
        duplicate: false,
      }),
    });

    const { repository } = createTestRepository(fetchMock);
    const result = await repository.act(
      'campus-inc-001',
      'resolve',
      3,
      { diagnosis: 'Sensor sustituido y calibrado correctamente' },
      'resolve-key-001',
    );

    expect(result.id).toBe('campus-inc-001');
    expect(result.status).toBe('resolved');
    expect(result.version).toBe(4);
    expect(fetchMock).toHaveBeenCalledWith(
      'https://campusops.test/v1/incidents/campus-inc-001/actions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          'Idempotency-Key': 'resolve-key-001',
          Authorization: 'Bearer course-valid-token',
          'X-Course-Actor': 'technician-1',
        }),
      }),
    );
  });

  it('failure scenario: reproduces lost response after server commit and verifies idempotent replay without duplicates', async () => {
    jest.useFakeTimers();

    const committedIncident = {
      ...baseIncident,
      version: 4,
      status: 'resolved',
      payload: {
        ...baseIncident.payload,
        diagnosis: 'Reemplazo de componente efectuado',
        history: [
          ...baseIncident.payload.history,
          { operationId: 'resolve-lost-response-key', actorId: 'technician-1', action: 'resolve', version: 4 },
        ],
      },
    };

    // 1. En el primer intento el servidor guarda el commit, pero la respuesta no llega al cliente antes del timeout
    const fetchMock = jest.fn()
      .mockImplementationOnce((_url, init?: RequestInit) => new Promise((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')), { once: true });
      }))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: async () => ({
          incident: committedIncident,
          operationId: 'resolve-lost-response-key',
          duplicate: true,
        }),
      });

    const { repository } = createTestRepository(fetchMock, 20);

    const firstAttempt = repository.act(
      'campus-inc-001',
      'resolve',
      3,
      { diagnosis: 'Reemplazo de componente efectuado' },
      'resolve-lost-response-key',
    ).catch((error: unknown) => error);

    await jest.advanceTimersByTimeAsync(25);
    const firstResult = await firstAttempt;
    expect(firstResult).toMatchObject({ kind: 'timeout' });

    // 2. El cliente consulta la política planRetry para saber si debe reintentar tras timeout
    const retryPlan = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 1,
      idempotencyKey: 'resolve-lost-response-key',
    });
    expect(retryPlan).toEqual({
      retry: true,
      delayMs: 1_000,
      requiresStableIdempotencyKey: false,
    });

    // 3. El cliente reintenta con la misma clave estable; el servidor detecta idempotencia y retorna duplicate=true
    const replayed = await repository.act(
      'campus-inc-001',
      'resolve',
      3,
      { diagnosis: 'Reemplazo de componente efectuado' },
      'resolve-lost-response-key',
    );

    // 4. Verificación de ausencia de efectos duplicados
    expect(replayed.status).toBe('resolved');
    expect(replayed.version).toBe(4);
    const resolveHistory = committedIncident.payload.history.filter((h) => h.action === 'resolve');
    expect(resolveHistory).toHaveLength(1);
    expect(resolveHistory[0]?.operationId).toBe('resolve-lost-response-key');
  });

  it('boundary: halts retry progression at attempt four preventing runaway requests', () => {
    const planAttempt3 = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 3,
      idempotencyKey: 'op-retry-bounded',
    });
    expect(planAttempt3.retry).toBe(true);
    if (planAttempt3.retry) {
      expect(planAttempt3.delayMs).toBe(4_000);
    }

    const planAttempt4 = planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 4,
      idempotencyKey: 'op-retry-bounded',
    });
    expect(planAttempt4).toEqual({ retry: false });
  });

  it('boundary: rejects unsafe POST retries missing stable idempotency key', () => {
    const unsafePlan = planRetry({
      method: 'POST',
      status: 503,
      attempt: 1,
      idempotencyKey: '',
    });
    expect(unsafePlan).toEqual({
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: true,
    });
  });
});
