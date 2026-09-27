import { toSafeError } from '../campusops/application/safeErrors';

export type BackendHealth = Readonly<{
  ok: true;
  service: 'dmi-controlled-backend';
  contractVersion: 1;
}>;

const DEFAULT_URL = 'http://127.0.0.1:4310';

export async function getBackendHealth(
  baseUrl = process.env.EXPO_PUBLIC_COURSE_BACKEND_URL ?? DEFAULT_URL,
): Promise<BackendHealth> {
  try {
    return await readBackendHealth(baseUrl);
  } catch (error: unknown) {
    throw toSafeError(error);
  }
}

async function readBackendHealth(baseUrl: string): Promise<BackendHealth> {
  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    const codes: Readonly<Record<number, string>> = {
      400: 'invalid_request', 401: 'unauthorized', 403: 'forbidden',
      404: 'not_found', 409: 'version_conflict', 422: 'invalid_contract',
      429: 'rate_limited',
    };
    throw toSafeError({ code: codes[response.status] });
  }
  const payload: unknown = await response.json();
  if (
    typeof payload !== 'object' ||
    payload === null ||
    !('ok' in payload) ||
    payload.ok !== true ||
    !('contractVersion' in payload) ||
    payload.contractVersion !== 1
  ) {
    throw new Error('Backend health contract mismatch');
  }
  return payload as BackendHealth;
}
