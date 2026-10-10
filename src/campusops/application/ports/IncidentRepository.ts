import type { Incident } from '../../domain/Incident';

export type CreateIncidentInput = Readonly<{
  category: Incident['category'];
  description: string;
  location: string;
}>;

export type IncidentAction = 'resolve' | 'close' | 'reopen';

export interface IncidentRepository {
  list(): Promise<readonly Incident[]>;
  getById(id: string): Promise<Incident | null>;
  create(input: CreateIncidentInput, idempotencyKey: string): Promise<Incident>;
  act(
    id: string,
    action: IncidentAction,
    baseVersion: number,
    details: Readonly<{ diagnosis?: string }>,
    idempotencyKey: string,
  ): Promise<Incident>;
}
