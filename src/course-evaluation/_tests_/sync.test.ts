import { deduplicateOperations, resolveSync } from '../index';

describe('week 08 sync adapters', () => {
  it('compares nested JSON values by content and preserves inputs', () => {
    const base = { id: 'r1', version: 1, fields: { metadata: { a: 1, b: [2, 3] } } } as const;
    const local = { ...base, fields: { metadata: { b: [2, 3], a: 2 } } } as const;
    const remote = { ...base, version: 2, fields: { metadata: { b: [2, 3], a: 2 } } } as const;
    const before = JSON.stringify({ base, local, remote });

    expect(resolveSync(base, local, remote)).toEqual({
      kind: 'merged',
      fields: { metadata: { b: [2, 3], a: 2 } },
    });
    expect(JSON.stringify({ base, local, remote })).toBe(before);
  });

  it('reports a nested collision without mutating either side', () => {
    const base = { id: 'r1', version: 1, fields: { metadata: { a: 1, b: [2, 3] } } } as const;
    const local = { ...base, fields: { metadata: { a: 2, b: [2, 3] } } } as const;
    const remote = { ...base, version: 2, fields: { metadata: { a: 3, b: [2, 3] } } } as const;

    expect(resolveSync(base, local, remote)).toEqual({ kind: 'conflict', fields: ['metadata'] });
  });

  it('merges independent nested fields and returns independent values', () => {
    const base = { id: 'r1', version: 1, fields: { work: { status: 'assigned' }, priority: 1 } } as const;
    const local = { ...base, fields: { work: { status: 'in_progress' }, priority: 1 } } as const;
    const remote = { ...base, version: 2, fields: { work: { status: 'assigned' }, priority: 2 } } as const;

    const result = resolveSync(base, local, remote);
    expect(result).toEqual({
      kind: 'merged',
      fields: { work: { status: 'in_progress' }, priority: 2 },
    });
    if (result.kind === 'merged') {
      expect(result.fields.work).not.toBe(local.fields.work);
    }
  });

  it('keeps the first object for each operation id', () => {
    const first = { operationId: 'op-1', payload: { value: 1 } };
    const duplicate = { operationId: 'op-1', payload: { value: 2 } };
    const second = { operationId: 'op-2', payload: { value: 3 } };
    const operations = [first, duplicate, second];

    expect(deduplicateOperations(operations)).toEqual([first, second]);
    expect(deduplicateOperations(operations)[0]).toBe(first);
    expect(operations).toEqual([first, duplicate, second]);
  });
});
