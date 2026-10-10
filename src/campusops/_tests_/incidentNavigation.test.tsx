import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { BackHandler } from 'react-native';

import App from '../../../App';
import { getBackendHealth } from '../../api/courseBackend';
import { createIncidentQueries } from '../application/incidentQueries';
import type { IncidentRepository } from '../application/ports/IncidentRepository';
import type { Incident } from '../domain/Incident';
import { CampusOpsScreen } from '../ui/CampusOpsScreen';

jest.mock('../../api/courseBackend', () => ({
  getBackendHealth: jest.fn(),
}));

jest.mock('../infrastructure/ExpoSecureSessionStore', () => ({
  ExpoSecureSessionStore: class {
    async load() {
      return {
        accessToken: 'course-valid-token',
        refreshToken: 'course-refresh-token',
        expiresAt: 4_102_444_800_000,
      };
    }
  },
}));

const sample: Incident = {
  id: 'test-002', title: 'Equipo ficticio', description: 'Detalle exclusivo del equipo sintético.',
  status: 'open', category: 'equipment', location: 'Zona ficticia de pruebas',
};
const available = async () => undefined;
const defaultRepository: IncidentRepository = {
  list: async () => [sample],
  getById: async (id) => id === sample.id ? sample : null,
  create: async (input) => ({
    id: 'created-test-001', title: input.description, description: input.description,
    status: 'open', category: input.category, location: input.location,
  }),
  act: async () => sample,
};

const remoteIncidents = [
  {
    id: 'demo-inc-001', version: 1, status: 'open',
    payload: { category: 'electrical', description: 'Luminaria de práctica apagada', location: 'Aula de prueba 101' },
  },
  {
    id: 'demo-inc-002', version: 1, status: 'assigned',
    payload: { category: 'connectivity', description: 'Conexión intermitente de laboratorio', location: 'Laboratorio de prueba 2' },
  },
  {
    id: 'demo-inc-003', version: 1, status: 'in_progress',
    payload: { category: 'water', description: 'Fuga simulada en lavabo', location: 'Zona de prueba 3' },
  },
];

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

afterEach(() => {
  jest.restoreAllMocks();
  jest.clearAllMocks();
});

test('the composed app supports list, correct detail and return while backend is offline', async () => {
  jest.mocked(getBackendHealth).mockRejectedValue(new Error('backend offline'));
  process.env.EXPO_PUBLIC_COURSE_ACTOR_ID = 'reporter-1';
  jest.spyOn(global, 'fetch').mockImplementation(async (input) => {
    const url = String(input);
    const body = url.endsWith('/v1/incidents/demo-inc-002')
      ? remoteIncidents[1]
      : { items: remoteIncidents };
    return {
      ok: true,
      status: 200,
      json: async () => body,
    } as Response;
  });
  const view = await render(<App />);
  expect(view.getByText('CampusOps')).toBeTruthy();
  await waitFor(() => expect(view.getByTestId('backend-status')).toHaveTextContent('Backend: offline'));
  expect(await view.findByText('Luminaria de práctica apagada')).toBeTruthy();
  expect(view.getByText('Fuga simulada en lavabo')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Abrir incidencia: Conexión intermitente de laboratorio' }));
  expect(await view.findByText('Detalle de incidencia')).toBeTruthy();
  expect(view.getByText('ID: demo-inc-002')).toBeTruthy();
  expect(view.getByText('Estado: Asignada')).toBeTruthy();
  expect(view.queryByText('Luminaria de práctica apagada')).toBeNull();
  await fireEvent.press(view.getByRole('button', { name: 'Volver' }));
  expect(await view.findByText('Incidencias')).toBeTruthy();
  expect(view.getByText('Luminaria de práctica apagada')).toBeTruthy();
  expect(getBackendHealth).toHaveBeenCalledTimes(1);
});

test('list works while backend health remains checking', async () => {
  const health = deferred<void>();
  const view = await render(
    <CampusOpsScreen incidents={createIncidentQueries(defaultRepository)} checkBackendHealth={() => health.promise} />,
  );
  expect(await view.findByText(sample.title)).toBeTruthy();
  expect(view.getByTestId('backend-status')).toHaveTextContent('Backend: checking');
  await act(async () => { health.resolve(undefined); });
  expect(view.getByTestId('backend-status')).toHaveTextContent('Backend: available');
});

test('shows loading and then an empty list', async () => {
  const list = deferred<readonly Incident[]>();
  const view = await render(
    <CampusOpsScreen
      incidents={createIncidentQueries({ ...defaultRepository, list: () => list.promise })}
      checkBackendHealth={available}
    />,
  );
  expect(view.getByText('Cargando incidencias…')).toBeTruthy();
  await act(async () => { list.resolve([]); });
  expect(await view.findByText('No hay incidencias para mostrar.')).toBeTruthy();
});

test('list failure is visible and retry recovers', async () => {
  const list = jest.fn().mockRejectedValueOnce(new Error('failure')).mockResolvedValue([sample]);
  const view = await render(
    <CampusOpsScreen incidents={createIncidentQueries({ ...defaultRepository, list })} checkBackendHealth={available} />,
  );
  expect(await view.findByText('No se pudieron cargar las incidencias.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));
  expect(await view.findByText(sample.title)).toBeTruthy();
  expect(list).toHaveBeenCalledTimes(2);
});

test('missing detail is explicit and still allows return', async () => {
  const view = await render(
    <CampusOpsScreen
      incidents={createIncidentQueries({ ...defaultRepository, getById: async () => null })}
      checkBackendHealth={available}
    />,
  );
  await fireEvent.press(await view.findByRole('button', { name: `Abrir incidencia: ${sample.title}` }));
  expect(await view.findByText('No se encontró la incidencia.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Volver' }));
  expect(await view.findByText(sample.title)).toBeTruthy();
});

test('detail failure can be retried for the selected ID', async () => {
  const getById = jest.fn().mockRejectedValueOnce(new Error('detail failure')).mockResolvedValue(sample);
  const view = await render(
    <CampusOpsScreen incidents={createIncidentQueries({ ...defaultRepository, getById })} checkBackendHealth={available} />,
  );
  await fireEvent.press(await view.findByRole('button', { name: `Abrir incidencia: ${sample.title}` }));
  expect(await view.findByText('No se pudieron cargar las incidencias.')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Reintentar' }));
  expect(await view.findByText(sample.description)).toBeTruthy();
  expect(getById).toHaveBeenNthCalledWith(1, sample.id);
  expect(getById).toHaveBeenNthCalledWith(2, sample.id);
});

test('returning before detail completes ignores its obsolete response', async () => {
  const detail = deferred<Incident | null>();
  const view = await render(
    <CampusOpsScreen
      incidents={createIncidentQueries({ ...defaultRepository, getById: () => detail.promise })}
      checkBackendHealth={available}
    />,
  );
  await fireEvent.press(await view.findByRole('button', { name: `Abrir incidencia: ${sample.title}` }));
  expect(view.getByText('Cargando incidencias…')).toBeTruthy();
  await fireEvent.press(view.getByRole('button', { name: 'Volver' }));
  expect(await view.findByText('Incidencias')).toBeTruthy();
  await act(async () => { detail.resolve(sample); });
  expect(view.queryByText('Detalle de incidencia')).toBeNull();
  expect(view.getByText('Incidencias')).toBeTruthy();
});

test('Android back returns from detail and removes the listener', async () => {
  const remove = jest.fn();
  const listener = jest.spyOn(BackHandler, 'addEventListener').mockReturnValue({ remove });
  const view = await render(
    <CampusOpsScreen incidents={createIncidentQueries(defaultRepository)} checkBackendHealth={available} />,
  );
  await fireEvent.press(await view.findByRole('button', { name: `Abrir incidencia: ${sample.title}` }));
  expect(await view.findByText(sample.description)).toBeTruthy();
  const handler = listener.mock.calls.find(([event]) => event === 'hardwareBackPress')![1];
  await act(async () => { expect(handler({} as never)).toBe(true); });
  expect(await view.findByText('Incidencias')).toBeTruthy();
  expect(remove).toHaveBeenCalledTimes(1);
});

test('creation screen sends one UUID through the application flow and opens the created detail', async () => {
  const created: Incident = {
    id: 'created-001', title: 'Luz apagada', description: 'Luz apagada',
    status: 'open', category: 'maintenance', location: 'Aula ficticia',
  };
  const create = jest.fn().mockResolvedValue(created);
  const getById = jest.fn(async (id: string) => id === created.id ? created : null);
  const repository: IncidentRepository = { ...defaultRepository, create, getById };
  const randomUUID = jest.spyOn(globalThis.crypto, 'randomUUID').mockReturnValue('8a16d9fc-a226-4d33-912f-98eb6142bb40');
  const view = await render(
    <CampusOpsScreen
      incidents={createIncidentQueries(repository, () => ({ id: 'reporter-1', role: 'reporter' }))}
      checkBackendHealth={available}
    />,
  );

  await fireEvent.press(await view.findByRole('button', { name: 'Nueva incidencia' }));
  await fireEvent.changeText(view.getByLabelText('Descripción'), 'Luz apagada');
  await fireEvent.changeText(view.getByLabelText('Ubicación'), 'Aula ficticia');
  await fireEvent.press(view.getByRole('button', { name: 'Crear incidencia' }));

  await waitFor(() => expect(create).toHaveBeenCalledWith({
    category: 'maintenance', description: 'Luz apagada', location: 'Aula ficticia',
  }, '8a16d9fc-a226-4d33-912f-98eb6142bb40'));
  expect(randomUUID).toHaveBeenCalledTimes(1);
  expect(await view.findByText('ID: created-001')).toBeTruthy();
});
