import { toSafeError, type SafeError } from './safeErrors';

/** Data-only failures: never retain an original exception or response. */
export type ClientFailure = SafeError & (
  | Readonly<{ kind: 'contract'; reason: 'json' | 'schema' }>
  | Readonly<{ kind: 'http'; status: number }>
  | Readonly<{ kind: 'timeout' | 'network' | 'absent' | 'precondition' }>
);

type FailureDetails =
  | { kind: 'contract'; reason: 'json' | 'schema' }
  | { kind: 'http'; status: number }
  | { kind: 'timeout' | 'network' | 'absent' | 'precondition' };

const issued = new WeakSet<object>();

export function clientFailure(details: FailureDetails): ClientFailure {
  const httpCodes: Readonly<Record<number, string>> = {
    400: 'invalid_request', 401: 'unauthorized', 403: 'forbidden',
    404: 'not_found', 409: 'version_conflict', 422: 'invalid_contract', 429: 'rate_limited',
  };
  const code = details.kind === 'http' ? httpCodes[details.status]
    : details.kind === 'contract' || details.kind === 'precondition' ? 'invalid_request'
      : details.kind === 'network' ? 'NETWORK_ERROR' : 'INTERNAL_ERROR';
  const failure = Object.freeze({ ...toSafeError({ code }), ...details });
  issued.add(failure);
  return failure;
}

export function isClientFailure(value: unknown): value is ClientFailure {
  return typeof value === 'object' && value !== null && issued.has(value);
}
