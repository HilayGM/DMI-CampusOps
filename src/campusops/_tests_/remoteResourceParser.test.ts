import { parseRemoteResource } from '../../course-evaluation';
import { parseRemoteResourceDto } from '../infrastructure/RemoteResourceParser';

test('accepts the published envelope and ignores future envelope fields', () => {
  const input = {
    id: 'campus-inc-001',
    version: 2,
    status: 'assigned',
    payload: { category: 'connectivity', description: 'Falla ficticia' },
    futureField: 'forward-compatible',
  };

  expect(parseRemoteResource(input)).toEqual({
    ok: true,
    value: {
      id: 'campus-inc-001',
      version: 2,
      status: 'assigned',
      payload: input.payload,
    },
  });
});

test('keeps a valid null payload distinct from an invalid envelope', () => {
  expect(parseRemoteResource({ id: 'campus-inc-002', version: 0, status: 'open', payload: null }))
    .toEqual({
      ok: true,
      value: { id: 'campus-inc-002', version: 0, status: 'open', payload: null },
    });
  expect(parseRemoteResource({ id: 'campus-inc-002', version: 0, status: 'open' }))
    .toEqual({ ok: false, error: 'contract' });
});

test.each([
  null,
  [],
  { id: '', version: 1, status: 'open', payload: null },
  { id: 'campus-inc-001', version: -1, status: 'open', payload: null },
  { id: 'campus-inc-001', version: 1.5, status: 'open', payload: null },
  { id: 'campus-inc-001', version: '1', status: 'open', payload: null },
  { id: 'campus-inc-001', version: 1, status: ' ', payload: null },
  { id: 'campus-inc-001', version: 1, status: 'open', payload: [] },
])('rejects malformed remote data without throwing %#', (input) => {
  expect(parseRemoteResource(input)).toEqual({ ok: false, error: 'contract' });
});

test('does not mutate the remote object or its nested payload', () => {
  const input = {
    id: 'campus-inc-001', version: 1, status: 'assigned',
    payload: { nested: [{ value: 'synthetic' }] }, extra: { retained: true },
  };
  const before = JSON.stringify(input);

  parseRemoteResource(input);

  expect(JSON.stringify(input)).toBe(before);
});

test('the public adapter delegates to the application parser behavior', () => {
  const cases: unknown[] = [
    { id: 'campus-inc-001', version: 1, status: 'open', payload: null },
    { id: 'campus-inc-001', version: Number.NaN, status: 'open', payload: null },
  ];
  for (const input of cases) {
    expect(parseRemoteResource(input)).toEqual(parseRemoteResourceDto(input));
  }
});

test('hostile accessors and revoked proxies become controlled contract errors', () => {
  const accessor = Object.defineProperty({}, 'id', {
    get: () => { throw new Error('must not execute'); },
  });
  const revoked = Proxy.revocable({}, {});
  revoked.revoke();

  expect(parseRemoteResource(accessor)).toEqual({ ok: false, error: 'contract' });
  expect(parseRemoteResource(revoked.proxy)).toEqual({ ok: false, error: 'contract' });
});
