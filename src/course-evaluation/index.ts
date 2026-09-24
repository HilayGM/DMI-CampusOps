import type {
  AuthEvent,
  JsonObject,
  ParseResult,
  PermissionEvent,
  RemoteResponse,
  SyncRecord,
} from './contracts';
import type { IncidentLocation } from '../campusops/contracts';

function pending(name: string): never {
  throw new Error(`${name} must be implemented in the assigned week`);
}

const TELEMETRY_SENSITIVE_KEYS = new Set([
  'authorization',
  'password',
  'token',
  'accessToken',
  'refreshToken',
  'email',
  'displayName',
  'name',
  'userId',
  'reporterId',
  'technicianId',
  'assignedTechnicianId',
  'location',
  'latitude',
  'longitude',
  'photos',
  'evidence',
  'internalComments',
  'assignmentHistory',
].map((key) => key.toLowerCase().replaceAll(/[_-]/g, '')));

function normalizeTelemetryKey(key: string): string {
  return key.toLowerCase().replaceAll(/[_-]/g, '');
}

function redactTelemetryValue(input: unknown, seen: WeakMap<object, unknown>): unknown {
  if (Array.isArray(input)) {
    const existing = seen.get(input);
    if (existing) return existing;
    const copy: unknown[] = [];
    seen.set(input, copy);
    for (const item of input) copy.push(redactTelemetryValue(item, seen));
    return copy;
  }

  if (typeof input !== 'object' || input === null) return input;

  const existing = seen.get(input);
  if (existing) return existing;
  const copy: Record<string, unknown> = {};
  seen.set(input, copy);
  for (const [key, value] of Object.entries(input)) {
    copy[key] = TELEMETRY_SENSITIVE_KEYS.has(normalizeTelemetryKey(key))
      ? '[REDACTED]'
      : redactTelemetryValue(value, seen);
  }
  return copy;
}

export function redactForTelemetry(input: unknown): unknown {
  return redactTelemetryValue(input, new WeakMap());
}

export function parseRemoteResource(_input: unknown): ParseResult {
  return pending('parseRemoteResource');
}

export function coordinateRefresh(_events: readonly AuthEvent[]): Readonly<{
  status: 'anonymous' | 'authenticated';
  activeGeneration: number | null;
  refreshCalls: number;
  retriedRequestIds: readonly string[];
  persistedToken: string | null;
}> {
  return pending('coordinateRefresh');
}

export function resolveSync(
  _base: SyncRecord,
  _local: SyncRecord,
  _remote: SyncRecord,
): Readonly<{ kind: 'merged'; fields: JsonObject } | { kind: 'conflict'; fields: readonly string[] }> {
  return pending('resolveSync');
}

export function deduplicateOperations<T extends Readonly<{ operationId: string }>>(
  _operations: readonly T[],
): readonly T[] {
  return pending('deduplicateOperations');
}

export function planRetry(_input: Readonly<{
  method: 'GET' | 'POST';
  status: number | 'timeout';
  attempt: number;
  retryAfterMs?: number;
  idempotencyKey?: string;
}>): Readonly<{ retry: boolean; delayMs: number; requiresStableIdempotencyKey: boolean }> {
  return pending('planRetry');
}

export function reduceRemoteResponses(_input: Readonly<{
  activeRequestId: string;
  responses: readonly RemoteResponse[];
}>): Readonly<{ state: 'success' | 'error' | 'loading'; value?: unknown; error?: string }> {
  return pending('reduceRemoteResponses');
}

export function reducePermissionLifecycle(
  _events: readonly PermissionEvent[],
): Readonly<{ status: 'available' | 'denied' | 'blocked'; resourceActive: boolean }> {
  return pending('reducePermissionLifecycle');
}

/** Week 09: see docs/CAMPUSOPS_API.md; this is not a completed solution. */
export function selectIncidentLocation(_provider: unknown, _manualLabel: string): IncidentLocation {
  return pending('selectIncidentLocation');
}
