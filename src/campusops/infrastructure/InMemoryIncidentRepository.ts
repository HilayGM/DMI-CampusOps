import type { IncidentRepository } from '../application/ports/IncidentRepository';
import type { Incident } from '../domain/Incident';

const incidents: readonly Incident[] = Object.freeze([
  Object.freeze({
    id: 'demo-inc-001',
    title: 'Luminaria de práctica apagada',
    description: 'La luminaria del aula ficticia no enciende durante una simulación de mantenimiento.',
    status: 'open',
    category: 'electrical',
    location: 'Campus ficticio · Edificio Alfa · Aula de prueba 101',
  } as const),
  Object.freeze({
    id: 'demo-inc-002',
    title: 'Conexión intermitente de laboratorio',
    description: 'Los equipos sintéticos del laboratorio pierden la conexión en el escenario de prueba.',
    status: 'assigned',
    category: 'connectivity',
    location: 'Campus ficticio · Edificio Beta · Laboratorio de prueba 2',
  } as const),
  Object.freeze({
    id: 'demo-inc-003',
    title: 'Fuga simulada en lavabo',
    description: 'Se representa un goteo en una instalación ficticia para consultar su atención en curso.',
    status: 'in_progress',
    category: 'water',
    location: 'Campus ficticio · Edificio Gamma · Zona de prueba 3',
  } as const),
]);

export class InMemoryIncidentRepository implements IncidentRepository {
  async list(): Promise<readonly Incident[]> {
    return incidents.map((incident) => ({ ...incident }));
  }

  async getById(id: string): Promise<Incident | null> {
    const incident = incidents.find((item) => item.id === id);
    return incident ? { ...incident } : null;
  }
}
