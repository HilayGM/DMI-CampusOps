import type { IncidentCategory, IncidentStatus } from '../contracts';
import type { CreateIncidentInput, IncidentRepository } from '../application/ports/IncidentRepository';
import type { SecureSessionStore } from '../application/ports/SecureSessionStore';
import type { Incident } from '../domain/Incident';
import { parseRemoteResourceDto } from './RemoteResourceParser';

type HttpIncidentRepositoryOptions = Readonly<{
  baseUrl: string;
  sessionStore: SecureSessionStore;
  getActorId: () => Promise<string>;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}>;

class HttpError extends Error {
  constructor(readonly status: number) {
    super(`CampusOps request failed (${status})`);
  }
}

const validCategories: readonly string[] = [
  'electrical', 'laboratory', 'water', 'connectivity', 'equipment', 'safety', 'maintenance',
];
const validStatuses: readonly string[] = ['open', 'assigned', 'in_progress', 'resolved', 'closed'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function toIncident(input: unknown): Incident {
  const result = parseRemoteResourceDto(input);
  if (!result.ok || result.value.payload === null) {
    throw new Error('Invalid incident response');
  }

  const { id, status, payload } = result.value;
  const { category, description, location } = payload;
  if (
    typeof category !== 'string' || !validCategories.includes(category)
    || !validStatuses.includes(status)
    || typeof description !== 'string' || !description.trim()
    || typeof location !== 'string' || !location.trim()
  ) {
    throw new Error('Invalid incident response');
  }

  return {
    id,
    title: description,
    description,
    status: status as IncidentStatus,
    category: category as IncidentCategory,
    location,
  };
}

export class HttpIncidentRepository implements IncidentRepository {
  constructor(private readonly options: HttpIncidentRepositoryOptions) {}

  private async request(
    path: string,
    method: 'GET' | 'POST',
    body?: unknown,
    idempotencyKey?: string,
  ): Promise<unknown> {
    const [session, actorId] = await Promise.all([
      this.options.sessionStore.load(),
      this.options.getActorId(),
    ]);
    if (!session?.accessToken || !actorId.trim()) {
      throw new Error('CampusOps session or actor is unavailable');
    }
    if (method === 'POST' && (!idempotencyKey || idempotencyKey.trim().length < 8)) {
      throw new Error('A stable idempotency key is required');
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
      if (!response.ok) throw new HttpError(response.status);
      return await response.json() as unknown;
    } catch (error) {
      if (controller.signal.aborted) throw new Error('CampusOps request timed out');
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  }

  async list(): Promise<readonly Incident[]> {
    const response = await this.request('/v1/incidents', 'GET');
    if (!isRecord(response) || !Array.isArray(response.items)) {
      throw new Error('Invalid incident list response');
    }
    return response.items.map(toIncident);
  }

  async getById(id: string): Promise<Incident | null> {
    try {
      return toIncident(await this.request(`/v1/incidents/${encodeURIComponent(id)}`, 'GET'));
    } catch (error) {
      if (error instanceof HttpError && error.status === 404) return null;
      throw error;
    }
  }

  async create(input: CreateIncidentInput, idempotencyKey: string): Promise<Incident> {
    const response = await this.request('/v1/incidents', 'POST', input, idempotencyKey);
    if (!isRecord(response) || !('incident' in response)) {
      throw new Error('Invalid incident creation response');
    }
    return toIncident(response.incident);
  }
}