import { createIncidentQueries } from '../application/incidentQueries';
import type { IncidentRepository } from '../application/ports/IncidentRepository';
import type { Incident } from '../domain/Incident';
import { InMemoryIncidentRepository } from '../infrastructure/InMemoryIncidentRepository';

const incident: Incident = {
  id: 'incident-01',
  title: 'Prueba sintética',
  description: 'Prueba sintética',
  status: 'in_progress',
  category: 'equipment',
  location: 'Ubicación ficticia',
  version: 7,
  assigneeId: 'technician-1',
};

function createRepository(): jest.Mocked<IncidentRepository> {
  return {
    list: jest.fn().mockResolvedValue([incident]),
    getById: jest.fn().mockResolvedValue(incident),
    create: jest.fn().mockResolvedValue(incident),
    act: jest.fn().mockResolvedValue(incident),
  };
}

test('only a reporter can create an incident', async () => {
  const repository = createRepository();
  const queries = createIncidentQueries(repository, () => ({ id: 'technician-1', role: 'technician' }));
  const input = { category: 'equipment' as const, description: 'Falla', location: 'Aula de prueba' };

  await expect(queries.create(input, 'create-key-01'))
    .rejects.toMatchObject({ kind: 'http', status: 403, code: 'FORBIDDEN' });
  expect(repository.create).not.toHaveBeenCalled();

  const reporterQueries = createIncidentQueries(repository, () => ({ id: 'reporter-1', role: 'reporter' }));
  await expect(reporterQueries.create(input, 'create-key-01'))
    .resolves.toEqual(incident);
  expect(repository.create).toHaveBeenCalledTimes(1);
});

test('a technician can resolve only an incident assigned to that exact actor ID', async () => {
  const repository = createRepository();
  const queries = createIncidentQueries(repository, () => ({ id: 'technician-2', role: 'technician' }));

  await expect(queries.resolve(incident.id, 'Diagnóstico sintético', 'resolve-key-01'))
    .rejects.toMatchObject({ kind: 'http', status: 403, code: 'FORBIDDEN' });
  const coordinatorQueries = createIncidentQueries(
    repository, () => ({ id: 'coordinator-1', role: 'coordinator' }),
  );
  await expect(coordinatorQueries.resolve(incident.id, 'Diagnóstico sintético', 'resolve-key-02'))
    .rejects.toMatchObject({ kind: 'http', status: 403, code: 'FORBIDDEN' });
  expect(repository.act).not.toHaveBeenCalled();

  const assignedTechnicianQueries = createIncidentQueries(
    repository, () => ({ id: 'technician-1', role: 'technician' }),
  );
  await expect(assignedTechnicianQueries.resolve(incident.id, 'Diagnóstico sintético', 'resolve-key-03'))
    .resolves.toEqual(incident);
  expect(repository.act).toHaveBeenCalledWith(
    incident.id, 'resolve', incident.version, { diagnosis: 'Diagnóstico sintético' }, 'resolve-key-03',
  );
});

test('only coordination can close or reopen an incident', async () => {
  const repository = createRepository();
  const queries = createIncidentQueries(repository, () => ({ id: 'technician-1', role: 'technician' }));

  await expect(queries.close(incident.id, 'close-key-01'))
    .rejects.toMatchObject({ kind: 'http', status: 403 });
  await expect(queries.reopen(incident.id, 'reopen-key-01'))
    .rejects.toMatchObject({ kind: 'http', status: 403 });
  expect(repository.act).not.toHaveBeenCalled();

  const coordinatorQueries = createIncidentQueries(
    repository, () => ({ id: 'coordinator-1', role: 'coordinator' }),
  );
  await expect(coordinatorQueries.close(incident.id, 'close-key-02')).resolves.toEqual(incident);
  await expect(coordinatorQueries.reopen(incident.id, 'reopen-key-02')).resolves.toEqual(incident);
  expect(repository.act).toHaveBeenNthCalledWith(1, incident.id, 'close', incident.version, {}, 'close-key-02');
  expect(repository.act).toHaveBeenNthCalledWith(2, incident.id, 'reopen', incident.version, {}, 'reopen-key-02');
});

test('authorized operations preserve versioned status transitions in the in-memory repository', async () => {
  const repository = new InMemoryIncidentRepository();
  const technician = createIncidentQueries(
    repository, () => ({ id: 'technician-1', role: 'technician' }),
  );
  const coordinator = createIncidentQueries(
    repository, () => ({ id: 'coordinator-1', role: 'coordinator' }),
  );

  await expect(technician.resolve('demo-inc-003', 'Diagnóstico', 'resolve-key-01'))
    .resolves.toMatchObject({ status: 'resolved', version: 3 });
  await expect(coordinator.close('demo-inc-003', 'close-key-01'))
    .resolves.toMatchObject({ status: 'closed', version: 4 });
  await expect(coordinator.reopen('demo-inc-003', 'reopen-key-01'))
    .resolves.toMatchObject({ status: 'assigned', version: 5 });
});
