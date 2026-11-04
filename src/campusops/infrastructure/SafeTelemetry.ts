const REDACTED = '[REDACTED]';
const TECHNICAL_FIELDS = new Set([
  'correlationid',
  'requestid',
  'incidentid',
  'status',
  'attempt',
  'durationms',
]);
const SENSITIVE_FIELDS = new Set([
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
  'apikey',
  'secret',
  'clientsecret',
  'privatekey',
  'cookie',
  'setcookie',
  'password',
  'autorizacion',
  'email',
  'correo',
  'displayname',
  'name',
  'nombre',
  'userid',
  'actorid',
  'reporterid',
  'technicianid',
  'assignedtechnicianid',
  'location',
  'ubicacion',
  'latitude',
  'longitude',
  'photos',
  'photo',
  'foto',
  'photograph',
  'fotografia',
  'evidence',
  'internalcomment',
  'internalcomments',
  'comentariosinterno',
  'comentariosinternos',
  'comentariointerno',
  'assignmenthistory',
  // Free-text and error containers are not safe telemetry context.
  'comment',
  'comments',
  'notes',
  'text',
  'description',
  'diagnosis',
  'message',
  'stack',
  'cause',
  'session',
  'credentials',
]);

const SAFE_ERROR_CODES = new Set([
  'aborted',
  'conflict',
  'forbidden',
  'invalid_request',
  'network_error',
  'not_found',
  'rate_limited',
  'timeout',
  'unauthorized',
]);

function normalizeKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (TECHNICAL_FIELDS.has(normalized)) return false;
  return SENSITIVE_FIELDS.has(normalized)
    || normalized.includes('apikey')
    || normalized.includes('secret')
    || normalized.includes('privatekey')
    || normalized.includes('password')
    || normalized.includes('token')
    || normalized.includes('credential')
    || normalized.includes('cookie');
}

function isSafeTechnicalValue(key: string, value: unknown): boolean {
  const normalized = normalizeKey(key);
  if (normalized === 'attempt') return typeof value === 'number' && Number.isInteger(value) && value >= 0;
  if (normalized === 'durationms') return typeof value === 'number' && Number.isFinite(value) && value >= 0;
  if (normalized === 'status') {
    return (typeof value === 'string' && value.trim().length > 0)
      || (typeof value === 'number' && Number.isFinite(value));
  }
  return typeof value === 'string' && value.trim().length > 0;
}

function sanitizeValue(
  value: unknown,
  key: string | undefined,
  seen = new WeakMap<object, unknown>(),
): unknown {
  if (value === null || value === undefined) return value;

  if (key !== undefined) {
    const normalized = normalizeKey(key);
    if (isSensitiveKey(key)) return REDACTED;
    if (TECHNICAL_FIELDS.has(normalized)) return isSafeTechnicalValue(key, value) ? value : REDACTED;
    if (normalized === 'error' && typeof value === 'string') {
      return SAFE_ERROR_CODES.has(value) ? value : REDACTED;
    }
  }

  if (typeof value !== 'object') return REDACTED;
  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  const clone: unknown[] | Record<string, unknown> = Array.isArray(value) ? [] : {};
  seen.set(value, clone);
  for (const propertyKey of Object.keys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, propertyKey);
    const child = descriptor && 'value' in descriptor ? descriptor.value : undefined;
    Object.defineProperty(clone, propertyKey, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: descriptor && 'value' in descriptor
        ? sanitizeValue(child, propertyKey, seen)
        : REDACTED,
    });
  }
  return clone;
}

export function redactForTelemetry(input: unknown): unknown {
  return sanitizeValue(input, undefined);
}

export type SafeTelemetryEvent = Readonly<{ event: string; context: unknown }>;
export type TelemetrySink = (entry: SafeTelemetryEvent) => void;

/** Emits only cloned, redacted diagnostics. Telemetry failure never alters app behavior. */
export function recordSafeTelemetry(
  event: string,
  context: unknown,
  sink: TelemetrySink = (entry) => console.warn('CampusOps telemetry', entry),
): void {
  try {
    sink({ event, context: redactForTelemetry(context) });
  } catch {
    // Diagnostics are best effort and must not replace the application error.
  }
}
