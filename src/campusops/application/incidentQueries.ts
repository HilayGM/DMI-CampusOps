import type { Incident } from '../domain/Incident';
import type { CreateIncidentInput, IncidentRepository } from './ports/IncidentRepository';

export type IncidentQueries = Readonly<{
  list: () => Promise<readonly Incident[]>;
  getById: (id: string) => Promise<Incident | null>;
  create: (input: CreateIncidentInput, idempotencyKey: string) => Promise<Incident>;
}>;

/** Failures remain rejections; absence is represented by [] or null. */
export function createIncidentQueries(repository: IncidentRepository): IncidentQueries {
  return {
    async list() {
      return repository.list();
    },
    async getById(id) {
      return repository.getById(id);
    },
    async create(input, idempotencyKey) {
      return repository.create(input, idempotencyKey);
    },
  };
}
