import type { Incident } from '../domain/Incident';
import type { CampusActor } from '../contracts';
import { clientFailure } from './clientErrors';
import type { CreateIncidentInput, IncidentAction, IncidentRepository } from './ports/IncidentRepository';

export type IncidentQueries = Readonly<{
  list: () => Promise<readonly Incident[]>;
  getById: (id: string) => Promise<Incident | null>;
  create: (input: CreateIncidentInput, idempotencyKey: string) => Promise<Incident>;
  resolve: (id: string, diagnosis: string, idempotencyKey: string) => Promise<Incident>;
  close: (id: string, idempotencyKey: string) => Promise<Incident>;
  reopen: (id: string, idempotencyKey: string) => Promise<Incident>;
}>;

function hasRole(actor: CampusActor | null, role: CampusActor['role']): actor is CampusActor {
  return typeof actor === 'object' && actor !== null
    && actor.role === role && typeof actor.id === 'string' && actor.id.trim().length > 0;
}

/** Failures remain rejections; absence is represented by [] or null. */
export function createIncidentQueries(
  repository: IncidentRepository,
  getActor: () => CampusActor | null = () => null,
): IncidentQueries {
  async function changeStatus(
    id: string,
    action: IncidentAction,
    idempotencyKey: string,
    diagnosis?: string,
  ): Promise<Incident> {
    const actor = getActor();
    const requiredRole = action === 'resolve' ? 'technician' : 'coordinator';
    if (!hasRole(actor, requiredRole)) {
      throw clientFailure({ kind: 'http', status: 403 });
    }

    const incident = await repository.getById(id);
    if (incident === null) throw clientFailure({ kind: 'absent' });
    if (
      action === 'resolve'
      && (typeof incident.assigneeId !== 'string' || actor.id !== incident.assigneeId)
    ) {
      throw clientFailure({ kind: 'http', status: 403 });
    }
    if (!Number.isSafeInteger(incident.version) || incident.version === undefined) {
      throw clientFailure({ kind: 'contract', reason: 'schema' });
    }
    if (action === 'resolve' && (!diagnosis || !diagnosis.trim())) {
      throw clientFailure({ kind: 'precondition' });
    }

    return repository.act(
      id,
      action,
      incident.version,
      diagnosis === undefined ? {} : { diagnosis },
      idempotencyKey,
    );
  }

  return {
    async list() {
      return repository.list();
    },
    async getById(id) {
      return repository.getById(id);
    },
    async create(input, idempotencyKey) {
      const actor = getActor();
      if (!hasRole(actor, 'reporter')) {
        throw clientFailure({ kind: 'http', status: 403 });
      }
      return repository.create(input, idempotencyKey);
    },
    async resolve(id, diagnosis, idempotencyKey) {
      return changeStatus(id, 'resolve', idempotencyKey, diagnosis);
    },
    async close(id, idempotencyKey) {
      return changeStatus(id, 'close', idempotencyKey);
    },
    async reopen(id, idempotencyKey) {
      return changeStatus(id, 'reopen', idempotencyKey);
    },
  };
}
