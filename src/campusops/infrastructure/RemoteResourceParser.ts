export type RemoteResourceDto = Readonly<{
  id: string;
  version: number;
  status: string;
  payload: Readonly<Record<string, unknown>> | null;
}>;

export type RemoteResourceParseResult =
  | Readonly<{ ok: true; value: RemoteResourceDto }>
  | Readonly<{ ok: false; error: 'contract' }>;

function readSafeProperty(input: object, key: string): unknown {
  if (!(key in input)) return undefined;
  try {
    return (input as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

function isJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the public remote envelope without mutating it or interpreting its
 * domain payload. Future envelope fields are deliberately ignored.
 *
 * Supports both plain debug literals and release-mode prototype-delegated/accessor
 * DTOs emitted by Hermes/Metro bytecode optimizers.
 */
export function parseRemoteResourceDto(input: unknown): RemoteResourceParseResult {
  try {
    if (!isJsonObject(input)) return { ok: false, error: 'contract' };

    const id = readSafeProperty(input, 'id');
    const version = readSafeProperty(input, 'version');
    const status = readSafeProperty(input, 'status');
    const payload = readSafeProperty(input, 'payload');

    if (
      typeof id !== 'string' || id.trim().length === 0
      || typeof status !== 'string' || status.trim().length === 0
      || typeof version !== 'number' || !Number.isInteger(version) || version < 0
      || (payload !== null && !isJsonObject(payload))
    ) {
      return { ok: false, error: 'contract' };
    }

    return { ok: true, value: { id, version, status, payload } };
  } catch {
    return { ok: false, error: 'contract' };
  }
}
