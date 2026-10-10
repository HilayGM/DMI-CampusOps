import type { IncidentCategory, IncidentStatus } from '../contracts';
import type {
  CreateIncidentInput,
  IncidentAction,
  IncidentRepository,
} from '../application/ports/IncidentRepository';
import type { SecureSessionStore } from '../application/ports/SecureSessionStore';
import type { Incident } from '../domain/Incident';
import { parseRemoteResourceDto } from './RemoteResourceParser';
import { clientFailure, isClientFailure } from '../application/clientErrors';
import { recordSafeTelemetry } from './SafeTelemetry';

type HttpIncidentRepositoryOptions = Readonly<{
  baseUrl: string;
  sessionStore: SecureSessionStore;
  getActorId: () => Promise<string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

const validCategories: readonly string[] = [
  'electrical', 'laboratory', 'water', 'connectivity', 'equipment', 'safety', 'maintenance',
];
const validStatuses: readonly string[] = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIncident(input: unknown): Incident | null {
  const result = parseRemoteResourceDto(input);
  if (!result.ok) throw clientFailure({ kind: 'contract', reason: 'schema' });
  if (result.value.payload === null) return null;

  const { id, status, payload } = result.value;
  const { category, description, location } = payload;
  if (
    typeof category !== 'string' || !validCategories.includes(category)
    || !validStatuses.includes(status)
    || typeof description !== 'string' || !description.trim()
    || typeof location !== 'string' || !location.trim()
  ) {
    throw clientFailure({ kind: 'contract', reason: 'schema' });
  }

  const incident = {
    id,
    title: description,
    description,
    status: status as IncidentStatus,
    category: category as IncidentCategory,
    location,
    version: result.value.version,
  } as const;
  if ('assignedTechnicianId' in payload) {
    const assigneeId = payload.assignedTechnicianId;
    if (assigneeId !== null && (typeof assigneeId !== 'string' || !assigneeId.trim())) {
      throw clientFailure({ kind: 'contract', reason: 'schema' });
    }
    return { ...incident, assigneeId };
  }
  return incident;
}

export class HttpIncidentRepository implements IncidentRepository {
  constructor(private readonly options: HttpIncidentRepositoryOptions) {}

  private async execute<T>(
    operation: 'list' | 'detail' | 'create' | 'action',
    work: () => Promise<T>,
  ): Promise<T> {
    try {
      return await work();
    } catch (error: unknown) {
      const failure = isClientFailure(error) ? error : clientFailure({ kind: 'contract', reason: 'schema' });
      recordSafeTelemetry('incident_request_failed', { operation, error: failure });
      throw failure;
    }
  }

  private async request(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<unknown> {
    const [session, actorId] = await Promise.all([
      this.options.sessionStore.load(),
      this.options.getActorId(),
    ]).catch(() => { throw clientFailure({ kind: 'precondition' }); });
    if (!session?.accessToken || !actorId.trim()) {
      throw clientFailure({ kind: 'precondition' });
    }
    if (method === 'POST' && (!idempotencyKey || idempotencyKey.trim().length < 8)) {
      throw clientFailure({ kind: 'precondition' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 8_000);
    try {
      const response = await (this.options.fetchImpl ?? fetch)(
        `${this.options.baseUrl.replace(/\/$/, '')}${path}`,
        {
          method,
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${session.accessToken}`,
            'X-Course-Actor': actorId,
            ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
            ...(idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {}),
          },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
        },
      );
      if (!response.ok) throw clientFailure({ kind: 'http', status: response.status });
      try {
        return await response.json() as unknown;
      } catch {
        throw clientFailure(controller.signal.aborted
          ? { kind: 'timeout' } : { kind: 'contract', reason: 'json' });
      }
    } catch (error) {
      if (controller.signal.aborted) throw clientFailure({ kind: 'timeout' });
      if (isClientFailure(error)) throw error;
      throw clientFailure({ kind: 'network' });
    } finally {
      clearTimeout(timeout);
    }
  }

  async list(): Promise<readonly Incident[]> {
    return this.execute('list', async () => {
      const response = await this.request('/v1/incidents', 'GET');
      if (!isRecord(response) || !Array.isArray(response.items)) {
        throw clientFailure({ kind: 'contract', reason: 'schema' });
      }
      return response.items.map(toIncident).filter((item): item is Incident => item !== null);
    });
  }

  async getById(id: string): Promise<Incident | null> {
    return this.execute('detail', async () => {
      try {
        return toIncident(await this.request(`/v1/incidents/${encodeURIComponent(id)}`, 'GET'));
      } catch (error) {
        if (isClientFailure(error) && error.kind === 'http' && error.status === 404) return null;
        throw error;
      }
    });
  }

  async create(input: CreateIncidentInput, idempotencyKey: string): Promise<Incident> {
    return this.execute('create', async () => {
      const response = await this.request('/v1/incidents', 'POST', input, idempotencyKey);
      if (!isRecord(response) || !('incident' in response)
        || typeof response.operationId !== 'string' || !response.operationId.trim()
        || typeof response.duplicate !== 'boolean') {
        throw clientFailure({ kind: 'contract', reason: 'schema' });
      }
      const incident = toIncident(response.incident);
      if (incident === null) throw clientFailure({ kind: 'absent' });
      return incident;
    });
  }

  async act(
    id: string,
    action: IncidentAction,
    baseVersion: number,
    details: Readonly<{ diagnosis?: string }>,
    idempotencyKey: string,
  ): Promise<Incident> {
    return this.execute('action', async () => {
      const response = await this.request(
        `/v1/incidents/${encodeURIComponent(id)}/actions`,
        'POST',
        { action, baseVersion, ...details },
        idempotencyKey,
      );
      if (!isRecord(response) || !('incident' in response)
        || typeof response.operationId !== 'string' || !response.operationId.trim()
        || typeof response.duplicate !== 'boolean') {
        throw clientFailure({ kind: 'contract', reason: 'schema' });
      }
      const incident = toIncident(response.incident);
      if (incident === null) throw clientFailure({ kind: 'absent' });
      return incident;
    });
  }
}
