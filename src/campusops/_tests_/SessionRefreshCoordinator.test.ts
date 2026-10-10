import { coordinateRefresh } from '../../course-evaluation';
import { SessionRefreshCoordinator } from '../application/SessionRefreshCoordinator';

test('coalesces concurrent 401 responses into one refresh and one retry per request', () => {
  const result = coordinateRefresh([
    { type: 'request401', requestId: 'list', generation: 0 },
    { type: 'request401', requestId: 'detail', generation: 0 },
    { type: 'request401', requestId: 'create', generation: 0 },
    { type: 'refreshSucceeded', generation: 1, token: 'synthetic-access-1' },
  ]);

  expect(result).toEqual({
    status: 'authenticated', activeGeneration: 1, refreshCalls: 1,
    retriedRequestIds: ['list', 'detail', 'create'], persistedToken: 'synthetic-access-1',
  });
});

test('ignores obsolete 401 responses and prevents a second refresh for an already retried request', () => {
  const result = coordinateRefresh([
    { type: 'request401', requestId: 'list', generation: 0 },
    { type: 'refreshSucceeded', generation: 1, token: 'synthetic-access-1' },
    { type: 'request401', requestId: 'obsolete', generation: 0 },
    { type: 'request401', requestId: 'list', generation: 1 },
  ]);

  expect(result.refreshCalls).toBe(1);
  expect(result.retriedRequestIds).toEqual(['list']);
  expect(result.status).toBe('authenticated');
});

test('does not rejoin a later refresh with a request that already exhausted its retry', () => {
  const coordinator = new SessionRefreshCoordinator();
  coordinator.applyAll([
    { type: 'request401', requestId: 'first', generation: 0 },
    { type: 'refreshSucceeded', generation: 1, token: 'synthetic-access-1' },
    { type: 'request401', requestId: 'second', generation: 1 },
    { type: 'request401', requestId: 'first', generation: 1 },
    { type: 'refreshSucceeded', generation: 2, token: 'synthetic-access-2' },
  ]);

  expect(coordinator.snapshot()).toMatchObject({
    phase: 'authenticated',
    activeGeneration: 2,
    refreshCalls: 2,
    retriedRequestIds: ['first', 'second'],
  });
});

test('expires with a controlled generation and clears authentication after refresh failure or logout', () => {
  const coordinator = new SessionRefreshCoordinator();
  coordinator.apply({ type: 'loginStarted' });
  coordinator.apply({ type: 'loginSucceeded', generation: 4, token: 'synthetic-access-4' });
  const clock = { now: jest.fn(() => 1_000) };
  expect(coordinator.expireIfNeeded(1_001, clock)).toBe(false);
  clock.now.mockReturnValue(1_001);
  expect(coordinator.expireIfNeeded(1_001, clock)).toBe(true);
  expect(coordinator.expireIfNeeded(1_001, clock)).toBe(false);
  expect(coordinator.snapshot()).toMatchObject({ phase: 'refreshing', refreshCalls: 1 });

  coordinator.apply({ type: 'refreshFailed' });
  expect(coordinator.snapshot()).toEqual({
    phase: 'anonymous', activeGeneration: null, refreshCalls: 1,
    retriedRequestIds: [], persistedToken: null,
  });

  coordinator.apply({ type: 'loginSucceeded', generation: 5, token: 'synthetic-access-5' });
  coordinator.apply({ type: 'logout' });
  expect(coordinator.snapshot()).toMatchObject({
    phase: 'anonymous', activeGeneration: null, persistedToken: null,
  });
});

test('never persists malformed login or refresh tokens', () => {
  const result = coordinateRefresh([
    { type: 'request401', requestId: 'list', generation: 0 },
    { type: 'refreshSucceeded', generation: 1, token: '' },
  ]);
  expect(result).toEqual({
    status: 'anonymous', activeGeneration: null, refreshCalls: 1,
    retriedRequestIds: [], persistedToken: null,
  });
});
