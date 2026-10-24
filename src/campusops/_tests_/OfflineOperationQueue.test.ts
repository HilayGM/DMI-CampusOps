import {
  OfflineOperationQueue,
  MemoryKeyValueStore,
  type KeyValueStore,
  type EnqueueOperationInput,
} from '../infrastructure/persistence/OfflineOperationQueue';

describe('OfflineOperationQueue (Week 08 - AC-02)', () => {
  let memoryStore: MemoryKeyValueStore;

  beforeEach(() => {
    memoryStore = new MemoryKeyValueStore();
    memoryStore.clearAll();
  });

  it('enqueues an operation with stable identity and stores required fields', async () => {
    const queue = new OfflineOperationQueue(memoryStore);
    const input: EnqueueOperationInput = {
      operationId: 'op-start-001',
      incidentId: 'incident-101',
      baseVersion: 1,
      authorId: 'technician-1',
      action: 'start_work',
      payload: {
        status: 'in_progress',
        assignedTechnicianId: 'technician-1',
      },
    };

    const stored = await queue.enqueue(input);

    expect(stored.operationId).toBe('op-start-001');
    expect(stored.incidentId).toBe('incident-101');
    expect(stored.baseVersion).toBe(1);
    expect(stored.authorId).toBe('technician-1');
    expect(stored.actorId).toBe('technician-1');
    expect(stored.action).toBe('start_work');
    expect(stored.payload).toEqual({
      status: 'in_progress',
      assignedTechnicianId: 'technician-1',
    });
    expect(stored.status).toBe('pending');
    expect(typeof stored.createdAt).toBe('number');
    expect(await queue.size()).toBe(1);
  });

  it('survives an application restart: a new queue instance reloads stored operations without loss', async () => {
    const initialQueue = new OfflineOperationQueue(memoryStore);

    await initialQueue.enqueue({
      operationId: 'op-001',
      incidentId: 'inc-demo-1',
      baseVersion: 1,
      authorId: 'tech-alpha',
      action: 'start_work',
      payload: { note: 'Iniciando revisión sin conexión' },
    });

    await initialQueue.enqueue({
      operationId: 'op-002',
      incidentId: 'inc-demo-1',
      baseVersion: 1,
      authorId: 'tech-alpha',
      action: 'add_note',
      payload: { text: 'Voltaje medido: 120V nominal' },
    });

    // Simulate complete application restart by instantiating a fresh queue on the same storage driver
    const reloadedQueue = new OfflineOperationQueue(memoryStore);

    const pending = await reloadedQueue.listPending();
    expect(pending).toHaveLength(2);
    expect(pending[0]?.operationId).toBe('op-001');
    expect(pending[1]?.operationId).toBe('op-002');
    expect(pending[1]?.payload).toEqual({ text: 'Voltaje medido: 120V nominal' });
  });

  it('preserves technician notes across app restarts so they remain usable offline', async () => {
    const queueBeforeRestart = new OfflineOperationQueue(memoryStore);

    await queueBeforeRestart.enqueue({
      operationId: 'op-note-1',
      incidentId: 'inc-water-01',
      baseVersion: 2,
      authorId: 'technician-2',
      action: 'add_note',
      payload: {
        text: 'Se detecta fisura en tubería principal del laboratorio',
        createdAt: '2026-10-20T10:00:00.000Z',
      },
    });

    // Simulate restart
    const queueAfterRestart = new OfflineOperationQueue(memoryStore);
    const notes = await queueAfterRestart.getPendingNotes('inc-water-01');

    expect(notes).toHaveLength(1);
    expect(notes[0]?.noteId).toBe('op-note-1');
    expect(notes[0]?.incidentId).toBe('inc-water-01');
    expect(notes[0]?.authorId).toBe('technician-2');
    expect(notes[0]?.text).toBe('Se detecta fisura en tubería principal del laboratorio');
    expect(notes[0]?.createdAt).toBe('2026-10-20T10:00:00.000Z');
  });

  it('preserves offline photo references across app restarts', async () => {
    const queueBeforeRestart = new OfflineOperationQueue(memoryStore);

    await queueBeforeRestart.enqueue({
      operationId: 'op-photo-1',
      incidentId: 'inc-elec-02',
      baseVersion: 1,
      authorId: 'technician-1',
      action: 'attach_photo',
      payload: {
        localUri: 'file:///data/user/0/com.campusops/cache/evidence_breaker_01.jpg',
        caption: 'Panel de interruptores dañado',
        createdAt: '2026-10-20T10:15:00.000Z',
      },
    });

    // Simulate restart
    const queueAfterRestart = new OfflineOperationQueue(memoryStore);
    const photos = await queueAfterRestart.getPendingPhotos('inc-elec-02');

    expect(photos).toHaveLength(1);
    expect(photos[0]?.photoId).toBe('op-photo-1');
    expect(photos[0]?.localUri).toBe('file:///data/user/0/com.campusops/cache/evidence_breaker_01.jpg');
    expect(photos[0]?.caption).toBe('Panel de interruptores dañado');
    expect(photos[0]?.authorId).toBe('technician-1');
  });

  it('behaves idempotently when the same operationId is re-enqueued', async () => {
    const queue = new OfflineOperationQueue(memoryStore);

    const first = await queue.enqueue({
      operationId: 'op-unique-42',
      incidentId: 'inc-99',
      baseVersion: 1,
      authorId: 'tech-1',
      action: 'start_work',
      payload: { initial: true },
    });

    const second = await queue.enqueue({
      operationId: 'op-unique-42',
      incidentId: 'inc-99',
      baseVersion: 1,
      authorId: 'tech-1',
      action: 'start_work',
      payload: { initial: false },
    });

    expect(await queue.size()).toBe(1);
    expect(second.operationId).toBe(first.operationId);
    expect(second.payload).toEqual({ initial: true }); // preserved original
  });

  it('confirms and dequeues confirmed operations without removing pending unconfirmed items', async () => {
    const queue = new OfflineOperationQueue(memoryStore);

    await queue.enqueue({ operationId: 'op-1', incidentId: 'inc-1', baseVersion: 1, authorId: 't1', action: 'act1' });
    await queue.enqueue({ operationId: 'op-2', incidentId: 'inc-1', baseVersion: 1, authorId: 't1', action: 'act2' });
    await queue.enqueue({ operationId: 'op-3', incidentId: 'inc-2', baseVersion: 1, authorId: 't2', action: 'act3' });

    expect(await queue.size()).toBe(3);

    // Confirm only op-1 and op-2
    const removedCount = await queue.confirm(['op-1', 'op-2']);
    expect(removedCount).toBe(2);

    expect(await queue.size()).toBe(1);
    expect(await queue.hasOperation('op-1')).toBe(false);
    expect(await queue.hasOperation('op-2')).toBe(false);
    expect(await queue.hasOperation('op-3')).toBe(true);
  });

  it('recovers safely from corrupt storage data without throwing unhandled exceptions', async () => {
    const corruptStore: KeyValueStore = {
      getItem: jest.fn().mockResolvedValue('invalid-json-content-{{['),
      setItem: jest.fn().mockResolvedValue(undefined),
      removeItem: jest.fn().mockResolvedValue(undefined),
    };

    const queue = new OfflineOperationQueue(corruptStore);

    await expect(queue.listPending()).resolves.toEqual([]);
    expect(await queue.size()).toBe(0);
    expect(await queue.peek()).toBeNull();
  });

  it('guarantees immutability of returned items', async () => {
    const queue = new OfflineOperationQueue(memoryStore);

    const stored = await queue.enqueue({
      operationId: 'op-freeze-1',
      incidentId: 'inc-freeze',
      baseVersion: 1,
      authorId: 'tech-safe',
      action: 'update_status',
      payload: { detail: 'test' },
    });

    expect(Object.isFrozen(stored)).toBe(true);
    expect(Object.isFrozen(stored.payload)).toBe(true);

    const list = await queue.listPending();
    expect(Object.isFrozen(list)).toBe(true);
  });
});
