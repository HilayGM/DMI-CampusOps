import { getBackendHealth } from '../api/courseBackend';
import { createIncidentQueries } from '../campusops/application/incidentQueries';
import type { BackendHealthPort } from '../campusops/application/ports/BackendHealthPort';
import { SessionService } from '../campusops/application/SessionService';
import { ExpoSecureSessionStore } from '../campusops/infrastructure/ExpoSecureSessionStore';
import { HttpIncidentRepository } from '../campusops/infrastructure/HttpIncidentRepository';

const baseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';
const sessionStore = new ExpoSecureSessionStore();
const session = new SessionService({ baseUrl, sessionStore });

const incidentsRepository = new HttpIncidentRepository({
  baseUrl,
  session,
});

const checkBackendHealth: BackendHealthPort = async () => {
  await getBackendHealth();
};

export const campusOpsDependencies = {
  incidents: createIncidentQueries(incidentsRepository),
  session,
  sessionActorId: process.env.EXPO_PUBLIC_COURSE_ACTOR_ID ?? '',
  checkBackendHealth,
};
