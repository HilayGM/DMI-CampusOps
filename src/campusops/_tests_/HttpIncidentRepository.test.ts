import type { SecureSessionStore } from '../application/ports/SecureSessionStore';
import { HttpIncidentRepository } from '../infrastructure/HttpIncidentRepository';

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

function createRepository() {
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
  });
  return { repository, fetchImpl };
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
  fetchImpl.mockResolvedValue(jsonResponse({ incident: resource }));
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

test('rejects a valid remote envelope with a null payload', async () => {
  const { repository, fetchImpl } = createRepository();
  fetchImpl.mockResolvedValue(jsonResponse({ incident: { ...resource, payload: null } }));

  await expect(repository.create({
    category: 'equipment', description: 'Descripción', location: 'Ubicación',
  }, 'operation-key-002')).rejects.toThrow('Invalid incident response');
});