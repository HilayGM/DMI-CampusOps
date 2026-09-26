const REDACTED = '[REDACTED]';
const TECHNICAL_FIELDS = new Set(['incidentid', 'status', 'attempt', 'durationms']);
const SENSITIVE_KEY_PARTS = [
  'token',
  'authorization',
  'autorizacion',
  'email',
  'correo',
  'name',
  'nombre',
  'location',
  'ubicacion',
  'photo',
  'foto',
  'photograph',
  'fotografia',
  'internalcomment',
  'comentariosinterno',
  'comentariointerno',
];

function normalizeKey(key: string): string {
  return key.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
}

function isSensitiveKey(key: string): boolean {
  const normalized = normalizeKey(key);
  if (TECHNICAL_FIELDS.has(normalized)) return false;
  return SENSITIVE_KEY_PARTS.some((part) => normalized.includes(part));
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