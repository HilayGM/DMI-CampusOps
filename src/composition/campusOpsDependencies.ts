import { getBackendHealth } from '../api/courseBackend';
import type { CampusActor, CampusRole } from '../campusops/contracts';
import { createIncidentQueries } from '../campusops/application/incidentQueries';
import type { BackendHealthPort } from '../campusops/application/ports/BackendHealthPort';
import { SessionService } from '../campusops/application/SessionService';
import { ExpoSecureSessionStore } from '../campusops/infrastructure/ExpoSecureSessionStore';
import { HttpIncidentRepository } from '../campusops/infrastructure/HttpIncidentRepository';

const baseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? 'http://127.0.0.1:4310';
const sessionStore = new ExpoSecureSessionStore();
const session = new SessionService({ baseUrl, sessionStore });

const isCampusRole = (value: string | undefined): value is CampusRole =>
  value === 'reporter' || value === 'technician' || value === 'coordinator';

const getCurrentActor = (): CampusActor | null => {
  const id = process.env.EXPO_PUBLIC_COURSE_ACTOR_ID;
  const role = process.env.EXPO_PUBLIC_COURSE_ACTOR_ROLE;
  return id?.trim() && isCampusRole(role) ? { id, role } : null;
};

const incidentsRepository = new HttpIncidentRepository({
  baseUrl,
  session,
});

const checkBackendHealth: BackendHealthPort = async () => {
  await getBackendHealth();
};

export const campusOpsDependencies = {
  incidents: createIncidentQueries(incidentsRepository, getCurrentActor),
  session,
  sessionActorId: process.env.EXPO_PUBLIC_COURSE_ACTOR_ID ?? '',
  checkBackendHealth,
};
