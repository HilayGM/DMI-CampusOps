export type SafeErrorCode =
  | 'UNAUTHORIZED' | 'FORBIDDEN' | 'NOT_FOUND' | 'INVALID_REQUEST'
  | 'CONFLICT' | 'RATE_LIMITED' | 'NETWORK_ERROR' | 'INTERNAL_ERROR';

export type SafeError = Readonly<{ code: SafeErrorCode; message: string }>;

const messages: Readonly<Record<SafeErrorCode, string>> = {
  UNAUTHORIZED: 'No autorizado.',
  FORBIDDEN: 'Acceso denegado.',
  NOT_FOUND: 'Recurso no encontrado.',
  INVALID_REQUEST: 'Solicitud inválida.',
  CONFLICT: 'Conflicto en la operación.',
  RATE_LIMITED: 'Demasiadas solicitudes.',
  NETWORK_ERROR: 'No fue posible conectar con el servicio.',
  INTERNAL_ERROR: 'Ocurrió un error inesperado.',
};

/** Reads only an own data property; never invokes an error's code getter. */
export function toSafeError(input: unknown): SafeError {
  let code: SafeErrorCode = 'INTERNAL_ERROR';
  try {
    const descriptor = typeof input === 'object' && input !== null
      ? Object.getOwnPropertyDescriptor(input, 'code') : undefined;
    const value: unknown = descriptor && 'value' in descriptor ? descriptor.value : undefined;
    switch (value) {
      case 'unauthorized': case 'UNAUTHORIZED': code = 'UNAUTHORIZED'; break;
      case 'forbidden': case 'FORBIDDEN': code = 'FORBIDDEN'; break;
      case 'not_found': case 'NOT_FOUND': code = 'NOT_FOUND'; break;
      case 'invalid_request': case 'invalid_contract': case 'INVALID_REQUEST':
        code = 'INVALID_REQUEST'; break;
      case 'version_conflict': case 'transition_conflict': case 'CONFLICT':
        code = 'CONFLICT'; break;
      case 'rate_limited': case 'RATE_LIMITED': code = 'RATE_LIMITED'; break;
      case 'NETWORK_ERROR': code = 'NETWORK_ERROR'; break;
    }
  } catch {
    // Even a revoked proxy must not expose its exception or prevent fallback.
  }
  return { code, message: messages[code] };
}
