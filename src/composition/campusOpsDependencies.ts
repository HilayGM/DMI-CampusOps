import { getBackendHealth } from '../api/courseBackend';
import { createIncidentQueries } from '../campusops/application/incidentQueries';
import type { BackendHealthPort } from '../campusops/application/ports/BackendHealthPort';
import { InMemoryIncidentRepository } from '../campusops/infrastructure/InMemoryIncidentRepository';

const checkBackendHealth: BackendHealthPort = async () => {
  await getBackendHealth();
};

export const campusOpsDependencies = {
  incidents: createIncidentQueries(new InMemoryIncidentRepository()),
  checkBackendHealth,
};
