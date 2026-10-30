import type {
  AuthEvent,
  JsonObject,
  ParseResult,
  PermissionEvent,
  RemoteResponse,
  SyncRecord,
} from './contracts';
import type { IncidentLocation } from '../campusops/contracts';
import { resolveIncidentLocation } from '../campusops/application/IncidentLocationResolver';
import { SessionRefreshCoordinator } from '../campusops/application/SessionRefreshCoordinator';
import { parseRemoteResourceDto } from '../campusops/infrastructure/RemoteResourceParser';
export { redactForTelemetry } from '../campusops/infrastructure/SafeTelemetry';

function pending(name: string): never {
  throw new Error(`${name} must be implemented in the assigned week`);
}

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonicalize);
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left < right ? -1 : left > right ? 1 : 0)
        .map(([key, entry]) => [key, canonicalize(entry)]),
    );
  }
  return value;
}

function sameJson(left: unknown, right: unknown): boolean {
  return JSON.stringify(canonicalize(left)) === JSON.stringify(canonicalize(right));
}

function cloneJsonValue<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cloneJsonValue) as T;
  if (value !== null && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]),
    ) as T;
  }
  return value;
}

function hasField(record: JsonObject, field: string): boolean {
  return Object.prototype.hasOwnProperty.call(record, field);
}

function fieldChanged(base: JsonObject, candidate: JsonObject, field: string): boolean {
  const baseHasField = hasField(base, field);
  const candidateHasField = hasField(candidate, field);
  return baseHasField !== candidateHasField
    || (baseHasField && candidateHasField && !sameJson(base[field], candidate[field]));
}

export function parseRemoteResource(input: unknown): ParseResult {
  return parseRemoteResourceDto(input);
}

export function coordinateRefresh(events: readonly AuthEvent[]): Readonly<{
  status: 'anonymous' | 'authenticated';
  activeGeneration: number | null;
  refreshCalls: number;
  retriedRequestIds: readonly string[];
  persistedToken: string | null;
}> {
  const snapshot = new SessionRefreshCoordinator().applyAll(events);
  return {
    status: snapshot.phase === 'authenticated' ? 'authenticated' : 'anonymous',
    activeGeneration: snapshot.activeGeneration,
    refreshCalls: snapshot.refreshCalls,
    retriedRequestIds: snapshot.retriedRequestIds,
    persistedToken: snapshot.persistedToken,
  };
}

export function resolveSync(
  base: SyncRecord,
  local: SyncRecord,
  remote: SyncRecord,
): Readonly<{ kind: 'merged'; fields: JsonObject } | { kind: 'conflict'; fields: readonly string[] }> {
  const fields = [...new Set([
    ...Object.keys(base.fields),
    ...Object.keys(local.fields),
    ...Object.keys(remote.fields),
  ])].sort((left, right) => left < right ? -1 : left > right ? 1 : 0);
  const merged: Record<string, unknown> = {};
  const conflicts: string[] = [];

  for (const field of fields) {
    const localChanged = fieldChanged(base.fields, local.fields, field);
    const remoteChanged = fieldChanged(base.fields, remote.fields, field);

    if (localChanged && remoteChanged) {
      if (sameJson(local.fields[field], remote.fields[field])
        && hasField(local.fields, field) === hasField(remote.fields, field)) {
        if (hasField(local.fields, field)) merged[field] = cloneJsonValue(local.fields[field]);
      } else {
        conflicts.push(field);
      }
    } else if (localChanged) {
      if (hasField(local.fields, field)) merged[field] = cloneJsonValue(local.fields[field]);
    } else if (remoteChanged) {
      if (hasField(remote.fields, field)) merged[field] = cloneJsonValue(remote.fields[field]);
    } else if (hasField(base.fields, field)) {
      merged[field] = cloneJsonValue(base.fields[field]);
    }
  }

  return conflicts.length > 0
    ? { kind: 'conflict', fields: conflicts }
    : { kind: 'merged', fields: merged };
}

export function deduplicateOperations<T extends Readonly<{ operationId: string }>>(
  operations: readonly T[],
): readonly T[] {
  const seen = new Set<string>();
  const result: T[] = [];
  for (const operation of operations) {
    if (seen.has(operation.operationId)) continue;
    seen.add(operation.operationId);
    result.push(operation);
  }
  return result;
}

const MAX_RETRY_ATTEMPT = 4;
const RETRY_BASE_DELAY_MS = 1_000;
const RETRY_MAX_DELAY_MS = 8_000;

export function planRetry(input: Readonly<{
  method: 'GET' | 'POST';
  status: number | 'timeout';
  attempt: number;
  retryAfterMs?: number;
  idempotencyKey?: string;
}>): Readonly<{ retry: false; delayMs?: 0; requiresStableIdempotencyKey?: boolean }>
  | Readonly<{ retry: true; delayMs: number; requiresStableIdempotencyKey: false }> {
  if (input.attempt >= MAX_RETRY_ATTEMPT
    || !Number.isInteger(input.attempt)
    || input.attempt < 1) {
    return { retry: false };
  }

  const hasStableIdempotencyKey = typeof input.idempotencyKey === 'string'
    && input.idempotencyKey.trim().length > 0;
  if (input.method === 'POST' && !hasStableIdempotencyKey) {
    return { retry: false, delayMs: 0, requiresStableIdempotencyKey: true };
  }

  const retryable = input.status === 'timeout'
    || input.status === 429
    || (typeof input.status === 'number' && input.status >= 500);
  if (!retryable) {
    return { retry: false, delayMs: 0, requiresStableIdempotencyKey: false };
  }

  const backoffDelayMs = Math.min(
    RETRY_BASE_DELAY_MS * 2 ** (input.attempt - 1),
    RETRY_MAX_DELAY_MS,
  );
  const delayMs = input.status === 429
    && typeof input.retryAfterMs === 'number'
    && Number.isFinite(input.retryAfterMs)
    && input.retryAfterMs >= 0
    ? input.retryAfterMs
    : backoffDelayMs;

  return {
    retry: true,
    delayMs,
    requiresStableIdempotencyKey: false,
  };
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

export function selectIncidentLocation(provider: unknown, manualLabel: string): IncidentLocation {
  return resolveIncidentLocation(provider, manualLabel);
}
