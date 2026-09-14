import { createIncidentQueries } from '../application/incidentQueries';
import type { IncidentRepository } from '../application/ports/IncidentRepository';
import { InMemoryIncidentRepository } from '../infrastructure/InMemoryIncidentRepository';

test('lists deterministic incidents with stable unique IDs', async () => {
  const queries = createIncidentQueries(new InMemoryIncidentRepository());
  const incidents = await queries.list();
  expect(incidents.length).toBeGreaterThan(1);
  expect(new Set(incidents.map((incident) => incident.id)).size).toBe(incidents.length);
  expect(incidents.map((incident) => incident.id)).toEqual([
    'demo-inc-001', 'demo-inc-002', 'demo-inc-003',
  ]);
  expect(await queries.list()).toEqual(incidents);
});

test('returns the requested incident, not the first item', async () => {
  const queries = createIncidentQueries(new InMemoryIncidentRepository());
  expect(await queries.getById('demo-inc-002')).toMatchObject({
    id: 'demo-inc-002',
    title: 'Conexión intermitente de laboratorio',
    category: 'connectivity',
    status: 'assigned',
  });
});

test('returns null for an unknown ID', async () => {
  const queries = createIncidentQueries(new InMemoryIncidentRepository());
  await expect(queries.getById('missing')).resolves.toBeNull();
});

test('application uses an alternative repository without knowing the fake', async () => {
  const incident = {
    id: 'alternative-001', title: 'Caso del doble', description: 'Descripción sintética',
    status: 'open', category: 'equipment', location: 'Zona ficticia',
  } as const;
  const repository: IncidentRepository = {
    list: jest.fn().mockResolvedValue([incident]),
    getById: jest.fn().mockResolvedValue(incident),
  };
  const queries = createIncidentQueries(repository);
  await expect(queries.list()).resolves.toEqual([incident]);
  await expect(queries.getById(incident.id)).resolves.toEqual(incident);
  expect(repository.list).toHaveBeenCalledTimes(1);
  expect(repository.getById).toHaveBeenCalledWith(incident.id);
});

test('preserves an empty list from the provider', async () => {
  const queries = createIncidentQueries({
    list: async () => [],
    getById: async () => null,
  });
  await expect(queries.list()).resolves.toEqual([]);
});

test('propagates list and detail failures rather than inventing empty results', async () => {
  const failure = new Error('controlled failure');
  const queries = createIncidentQueries({
    list: async () => { throw failure; },
    getById: async () => { throw failure; },
  });
  await expect(queries.list()).rejects.toBe(failure);
  await expect(queries.getById('demo-inc-001')).rejects.toBe(failure);
});

test('returned arrays and objects cannot modify the internal fixtures', async () => {
  const repository = new InMemoryIncidentRepository();
  const initial = await repository.list();
  const originalTitle = initial[0]!.title;
  Object.assign(initial[0]!, { title: 'Changed by a consumer' });
  // Simulate an untyped consumer mutating the returned collection.
  Array.prototype.pop.call(initial);
  const detail = await repository.getById('demo-inc-002');
  Object.assign(detail!, { description: 'Changed detail' });
  const next = await repository.list();
  expect(next).toHaveLength(3);
  expect(next[0]!.title).toBe(originalTitle);
  expect((await repository.getById('demo-inc-002'))!.description).not.toBe('Changed detail');
  expect(await new InMemoryIncidentRepository().list()).toEqual(next);
});
