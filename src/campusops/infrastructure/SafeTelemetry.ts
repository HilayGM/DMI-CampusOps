const REDACTED = '[REDACTED]';
const TECHNICAL_FIELDS = new Set(['incidentid', 'status', 'attempt', 'durationms']);
const SENSITIVE_FIELDS = new Set([
  // Required public contract fields.
  'token',
  'accesstoken',
  'refreshtoken',
  'authorization',
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

function normalizeKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (TECHNICAL_FIELDS.has(normalized)) return false;
  return SENSITIVE_FIELDS.has(normalized);
}

function cloneDeep(value: unknown, seen = new WeakMap<object, unknown>()): unknown {
  if (value === null || typeof value !== 'object') return value;
  const existing = seen.get(value);
  if (existing !== undefined) return existing;

  if (value instanceof Date) return new Date(value.getTime());

  const clone: unknown[] | Record<string, unknown> = Array.isArray(value) ? [] : {};
  seen.set(value, clone);
  for (const [key, child] of Object.entries(value)) {
    Object.defineProperty(clone, key, {
      configurable: true,
      enumerable: true,
      writable: true,
      value: cloneDeep(child, seen),
    });
  }
  return clone;
}

function redactNested(value: unknown, seen = new WeakSet<object>()): void {
  if (value === null || typeof value !== 'object' || seen.has(value)) return;
  seen.add(value);

  for (const [key, child] of Object.entries(value)) {
    if (isSensitiveKey(key)) {
      Object.defineProperty(value, key, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: REDACTED,
      });
    } else {
      redactNested(child, seen);
    }
  }
}

export function redactForTelemetry(input: unknown): unknown {
  const sanitized = cloneDeep(input);
  redactNested(sanitized);
  return sanitized;
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
