import type { Incident } from '../../domain/Incident';

export type CreateIncidentInput = Readonly<{
  category: Incident['category'];
  description: string;
  location: string;
}>;

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create(input: CreateIncidentInput, idempotencyKey: string): Promise<Incident>;
}
