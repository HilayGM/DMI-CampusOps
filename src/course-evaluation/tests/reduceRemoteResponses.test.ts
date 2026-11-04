import { reduceRemoteResponses } from '../index';

describe('reduceRemoteResponses', () => {
  it('returns the active successful response', () => {
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [{ requestId: 'request-b', value: { id: 'incident-b' } }],
    })).toEqual({ state: 'success', value: { id: 'incident-b' } });
  });

  it('keeps the active intent when responses arrive out of order', () => {
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [
        { requestId: 'request-b', value: { id: 'incident-b' } },
        { requestId: 'request-a', value: { id: 'incident-a' } },
      ],
    })).toEqual({ state: 'success', value: { id: 'incident-b' } });
  });

  it('stays loading with no responses and preserves an active empty result', () => {
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [],
    })).toEqual({ state: 'loading' });
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [{ requestId: 'request-b', value: [] }],
    })).toEqual({ state: 'success', value: [] });
  });

  it('ignores a late error from an obsolete request', () => {
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [
        { requestId: 'request-b', value: { id: 'incident-b' } },
        { requestId: 'request-a', error: 'obsolete request failed' },
      ],
    })).toEqual({ state: 'success', value: { id: 'incident-b' } });
    expect(reduceRemoteResponses({
      activeRequestId: 'request-b',
      responses: [{ requestId: 'request-a', error: 'obsolete request failed' }],
    })).toEqual({ state: 'loading' });
  });
});
