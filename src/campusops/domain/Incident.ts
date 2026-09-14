import type { IncidentCategory, IncidentStatus } from '../contracts';

export type Incident = Readonly<{
  id: string;
  title: string;
  description: string;
  status: IncidentStatus;
  category: IncidentCategory;
  location: string;
}>;
