import type { IncidentRepository } from '../application/ports/IncidentRepository';
import type { Incident } from '../domain/Incident';
import { clientFailure } from '../application/clientErrors';

const incidents: readonly Incident[] = Object.freeze([
  Object.freeze({
    id: 'demo-inc-001',
    title: 'Luminaria de práctica apagada',
    description: 'La luminaria del aula ficticia no enciende durante una simulación de mantenimiento.',
    status: 'open',
    category: 'electrical',
    location: 'Campus ficticio · Edificio Alfa · Aula de prueba 101',
    version: 1,
    assigneeId: null,
  } as const),
  Object.freeze({
    id: 'demo-inc-002',
    title: 'Conexión intermitente de laboratorio',
    description: 'Los equipos sintéticos del laboratorio pierden la conexión en el escenario de prueba.',
    status: 'assigned',
    category: 'connectivity',
    location: 'Campus ficticio · Edificio Beta · Laboratorio de prueba 2',
    version: 1,
    assigneeId: 'technician-1',
  } as const),
  Object.freeze({
    id: 'demo-inc-003',
    title: 'Fuga simulada en lavabo',
    description: 'Se representa un goteo en una instalación ficticia para consultar su atención en curso.',
    status: 'in_progress',
    category: 'water',
    location: 'Campus ficticio · Edificio Gamma · Zona de prueba 3',
    version: 2,
    assigneeId: 'technician-1',
  } as const),
]);

export class InMemoryIncidentRepository implements IncidentRepository {
  private readonly created = new Map<string, Incident>();
  private readonly changed = new Map<string, Incident>();

  async list(): Promise<readonly Incident[]> {
    return [...incidents, ...this.created.values()]
      .map((incident) => this.changed.get(incident.id) ?? incident)
      .map((incident) => ({ ...incident }));
  }

  async getById(id: string): Promise<Incident | null> {
    const fixture = incidents.find((item) => item.id === id);
    const incident = fixture ? this.changed.get(id) ?? fixture : undefined;
    const found = incident ?? [...this.created.values()].find((item) => item.id === id);
    return found ? { ...found } : null;
  }

  async create(input: import('../application/ports/IncidentRepository').CreateIncidentInput, idempotencyKey: string): Promise<Incident> {
    const existing = this.created.get(idempotencyKey);
    if (existing) return { ...existing };

    const incident: Incident = {
      id: `demo-inc-created-${this.created.size + 1}`,
      title: input.description,
      description: input.description,
      status: 'open',
      category: input.category,
      location: input.location,
      version: 1,
      assigneeId: null,
    };
    this.created.set(idempotencyKey, incident);
    return { ...incident };
  }

  async act(
    id: string,
    action: import('../application/ports/IncidentRepository').IncidentAction,
    baseVersion: number,
    _details: Readonly<{ diagnosis?: string }>,
    _idempotencyKey: string,
  ): Promise<Incident> {
    const incident = await this.getById(id);
    if (!incident) throw clientFailure({ kind: 'absent' });
    if (incident.version !== baseVersion) throw clientFailure({ kind: 'http', status: 409 });
    const allowed = action === 'resolve' ? incident.status === 'in_progress'
      : action === 'close' ? incident.status === 'resolved'
        : incident.status === 'closed' || incident.status === 'resolved';
    if (!allowed) throw clientFailure({ kind: 'http', status: 409 });
    const status = action === 'resolve' ? 'resolved'
      : action === 'close' ? 'closed'
        : incident.assigneeId ? 'assigned' : 'open';
    const next: Incident = { ...incident, status, version: baseVersion + 1 };
    this.changed.set(id, next);
    return { ...next };
  }
}
