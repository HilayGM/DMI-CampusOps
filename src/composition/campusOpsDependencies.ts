import { getBackendHealth } from '../api/courseBackend';
import { createIncidentQueries } from '../campusops/application/incidentQueries';
import type { BackendHealthPort } from '../campusops/application/ports/BackendHealthPort';
import { ExpoSecureSessionStore } from '../campusops/infrastructure/ExpoSecureSessionStore';
import { HttpIncidentRepository } from '../campusops/infrastructure/HttpIncidentRepository';

const session = new ExpoSecureSessionStore();

const getActorId = async (): Promise<string> => {
  const actorId = process.env.EXPO_PUBLIC_COURSE_ACTOR_ID;
  if (!actorId?.trim()) throw new Error('CampusOps actor is not configured');
  return actorId;
};

const incidentsRepository = new HttpIncidentRepository({
  baseUrl: process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310',
  sessionStore: session,
  getActorId,
});

const checkBackendHealth: BackendHealthPort = async () => {
  await getBackendHealth();
};

export const campusOpsDependencies = {
  incidents: createIncidentQueries(incidentsRepository),
  session,
  checkBackendHealth,
};
