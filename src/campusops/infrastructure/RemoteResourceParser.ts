export type RemoteResourceDto = Readonly<{
  id: string;
  version: number;
  status: string;
  payload: Readonly<Record<string, unknown>> | null;
}>;

export type RemoteResourceParseResult =
  | Readonly<{ ok: true; value: RemoteResourceDto }>
  | Readonly<{ ok: false; error: 'contract' }>;

function readOwnDataProperty(input: object, key: string): unknown {
  const descriptor = Object.getOwnPropertyDescriptor(input, key);
  return descriptor && 'value' in descriptor ? descriptor.value : undefined;
}

function isJsonObject(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates the public remote envelope without mutating it or interpreting its
 * domain payload. Future envelope fields are deliberately ignored.
 */
export function parseRemoteResourceDto(input: unknown): RemoteResourceParseResult {
  try {
    if (!isJsonObject(input)) return { ok: false, error: 'contract' };

    const id = readOwnDataProperty(input, 'id');
    const version = readOwnDataProperty(input, 'version');
    const status = readOwnDataProperty(input, 'status');
    const payload = readOwnDataProperty(input, 'payload');

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
