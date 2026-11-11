import type { RemoteResponse } from '../../course-evaluation/contracts';

export type RemoteResponseState =
  | Readonly<{ state: 'success'; value?: unknown }>
  | Readonly<{ state: 'error'; error: string }>;

export function reduceRemoteResponse(
  activeRequestId: string,
  response: RemoteResponse,
): RemoteResponseState | null {
  if (response.requestId !== activeRequestId) return null;
  if (typeof response.error === 'string') {
    return { state: 'error', error: response.error };
  }
  return { state: 'success', value: response.value };
}
