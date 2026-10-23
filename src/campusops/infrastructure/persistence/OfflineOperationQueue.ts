import type { PendingIncidentOperation } from '../../contracts';

export const OFFLINE_QUEUE_STORAGE_KEY = 'campusops.offline_queue.v1';

export type KeyValueStore = {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
};

export type OfflineNote = Readonly<{
  noteId: string;
  incidentId: string;
  authorId: string;
  text: string;
  createdAt: string;
}>;

export type OfflinePhotoReference = Readonly<{
  photoId: string;
  incidentId: string;
  authorId: string;
  localUri: string;
  caption?: string | undefined;
  createdAt: string;
}>;

export type StoredPendingOperation = Readonly<{
  operationId: string;
  incidentId: string;
  baseVersion: number;
  actorId: string;
  authorId: string;
  action: string;
  payload: Readonly<Record<string, unknown>>;
  createdAt: number;
  status: 'pending' | 'syncing' | 'failed';
}>;

export type EnqueueOperationInput = Readonly<{
  operationId: string;
  incidentId: string;
  baseVersion: number;
  actorId?: string;
  authorId?: string;
  action: string;
  payload?: Readonly<Record<string, unknown>>;
  createdAt?: number;
}>;

/**
 * Shared in-memory backing registry to simulate durable disk/flash persistence across
 * app reloads and independent queue instance lifecycles when using the in-memory driver.
 */
const sharedBackingStorage = new Map<string, string>();

export class MemoryKeyValueStore implements KeyValueStore {
  constructor(private readonly backing: Map<string, string> = sharedBackingStorage) {}

  async getItem(key: string): Promise<string | null> {
    return this.backing.get(key) ?? null;
  }

  async setItem(key: string, value: string): Promise<void> {
    this.backing.set(key, value);
  }

  async removeItem(key: string): Promise<void> {
    this.backing.delete(key);
  }

  /** Clears the underlying shared storage; intended for test isolation. */
  clearAll(): void {
    this.backing.clear();
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function sanitizeOperation(raw: unknown): StoredPendingOperation | null {
  if (!isRecord(raw)) return null;

  const operationId = typeof raw.operationId === 'string' ? raw.operationId.trim() : '';
  const incidentId = typeof raw.incidentId === 'string' ? raw.incidentId.trim() : '';
  const baseVersion = typeof raw.baseVersion === 'number' && Number.isSafeInteger(raw.baseVersion) && raw.baseVersion >= 0
    ? raw.baseVersion
    : 0;
  const actorId = typeof raw.actorId === 'string' && raw.actorId.trim().length > 0
    ? raw.actorId.trim()
    : typeof raw.authorId === 'string' && raw.authorId.trim().length > 0
      ? raw.authorId.trim()
      : '';
  const action = typeof raw.action === 'string' ? raw.action.trim() : '';
  const payload = isRecord(raw.payload) ? Object.freeze({ ...raw.payload }) : Object.freeze({});
  const createdAt = typeof raw.createdAt === 'number' && Number.isFinite(raw.createdAt)
    ? raw.createdAt
    : Date.now();
  const status: 'pending' | 'syncing' | 'failed' = raw.status === 'syncing' || raw.status === 'failed'
    ? raw.status
    : 'pending';

  if (!operationId || !incidentId || !actorId || !action) {
    return null;
  }

  return Object.freeze({
    operationId,
    incidentId,
    baseVersion,
    actorId,
    authorId: actorId,
    action,
    payload,
    createdAt,
    status,
  });
}

/**
 * OfflineOperationQueue
 * 
 * Provides durable, crash-resilient local persistence for pending incident operations
 * when the mobile app operates in disconnected or degraded network conditions.
 * 
 * Features:
 * - Stable identity indexing by operationId (idempotent enqueue).
 * - Preservation of technician notes and photo references across app restarts.
 * - Atomic persistence to underlying storage.
 * - Zero in-place mutations.
 */
export class OfflineOperationQueue {
  private readonly storageKey: string;
  private readonly store: KeyValueStore;

  constructor(
    store: KeyValueStore = new MemoryKeyValueStore(),
    storageKey: string = OFFLINE_QUEUE_STORAGE_KEY,
  ) {
    this.store = store;
    this.storageKey = storageKey;
  }

  /**
   * Loads all pending operations from durable storage, discarding invalid or corrupted items.
   */
  async listPending(): Promise<readonly StoredPendingOperation[]> {
    try {
      const raw = await this.store.getItem(this.storageKey);
      if (!raw) return [];

      const parsed: unknown = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];

      const result: StoredPendingOperation[] = [];
      for (const item of parsed) {
        const sanitized = sanitizeOperation(item);
        if (sanitized) {
          result.push(sanitized);
        }
      }
      return Object.freeze(result);
    } catch {
      // Return empty array on parse or read failure to avoid unrecoverable crash
      return Object.freeze([]);
    }
  }

  /**
   * Enqueues an operation idempotently.
   * If an operation with the same operationId already exists, it is preserved without duplicating.
   */
  async enqueue(input: EnqueueOperationInput | PendingIncidentOperation): Promise<StoredPendingOperation> {
    const actorId = ('actorId' in input && input.actorId)
      ? input.actorId
      : ('authorId' in input && input.authorId)
        ? input.authorId
        : '';

    const sanitized = sanitizeOperation({
      operationId: input.operationId,
      incidentId: input.incidentId,
      baseVersion: input.baseVersion,
      actorId,
      authorId: actorId,
      action: input.action,
      payload: input.payload ?? {},
      createdAt: ('createdAt' in input && typeof input.createdAt === 'number') ? input.createdAt : Date.now(),
      status: 'pending',
    });

    if (!sanitized) {
      throw new Error('Cannot enqueue an invalid pending operation: missing required fields');
    }

    const current = await this.listPending();
    const existing = current.find((op) => op.operationId === sanitized.operationId);
    if (existing) {
      // Idempotency: return existing operation without mutating queue
      return existing;
    }

    const updated = Object.freeze([...current, sanitized]);
    await this.persist(updated);
    return sanitized;
  }

  /**
   * Returns the oldest pending operation in queue order without removing it.
   */
  async peek(): Promise<StoredPendingOperation | null> {
    const list = await this.listPending();
    return list[0] ?? null;
  }

  /**
   * Removes a confirmed operation from the queue by its stable identity.
   * Returns true if the operation was found and removed, false otherwise.
   */
  async dequeue(operationId: string): Promise<boolean> {
    const current = await this.listPending();
    const filtered = current.filter((op) => op.operationId !== operationId);
    if (filtered.length === current.length) {
      return false;
    }
    await this.persist(filtered);
    return true;
  }

  /**
   * Atomically confirms and removes multiple operations by their operationIds.
   * Returns the count of removed items.
   */
  async confirm(operationIds: readonly string[]): Promise<number> {
    if (!operationIds || operationIds.length === 0) return 0;
    const toRemove = new Set(operationIds);
    const current = await this.listPending();
    const filtered = current.filter((op) => !toRemove.has(op.operationId));
    const removedCount = current.length - filtered.length;
    if (removedCount > 0) {
      await this.persist(filtered);
    }
    return removedCount;
  }

  /**
   * Retrieves all pending operations associated with a specific incident.
   */
  async getByIncidentId(incidentId: string): Promise<readonly StoredPendingOperation[]> {
    const current = await this.listPending();
    return Object.freeze(current.filter((op) => op.incidentId === incidentId));
  }

  /**
   * Extracts all pending offline notes for a specific incident.
   * Notes remain accessible and usable across application restarts.
   */
  async getPendingNotes(incidentId: string): Promise<readonly OfflineNote[]> {
    const ops = await this.getByIncidentId(incidentId);
    const notes: OfflineNote[] = [];

    for (const op of ops) {
      if (op.action === 'add_note' || op.action === 'diagnosis') {
        const text = typeof op.payload.text === 'string'
          ? op.payload.text
          : typeof op.payload.diagnosis === 'string'
            ? op.payload.diagnosis
            : typeof op.payload.note === 'string'
              ? op.payload.note
              : '';

        if (text) {
          notes.push(Object.freeze({
            noteId: op.operationId,
            incidentId: op.incidentId,
            authorId: op.authorId,
            text,
            createdAt: typeof op.payload.createdAt === 'string'
              ? op.payload.createdAt
              : new Date(op.createdAt).toISOString(),
          }));
        }
      }
    }

    return Object.freeze(notes);
  }

  /**
   * Extracts all pending offline photo references for a specific incident.
   * File references/URIs remain persisted across application restarts.
   */
  async getPendingPhotos(incidentId: string): Promise<readonly OfflinePhotoReference[]> {
    const ops = await this.getByIncidentId(incidentId);
    const photos: OfflinePhotoReference[] = [];

    for (const op of ops) {
      if (op.action === 'attach_photo' || op.action === 'add_evidence') {
        const localUri = typeof op.payload.localUri === 'string'
          ? op.payload.localUri
          : typeof op.payload.photoUri === 'string'
            ? op.payload.photoUri
            : typeof op.payload.uri === 'string'
              ? op.payload.uri
              : '';

        if (localUri) {
          photos.push(Object.freeze({
            photoId: op.operationId,
            incidentId: op.incidentId,
            authorId: op.authorId,
            localUri,
            caption: typeof op.payload.caption === 'string' ? op.payload.caption : undefined,
            createdAt: typeof op.payload.createdAt === 'string'
              ? op.payload.createdAt
              : new Date(op.createdAt).toISOString(),
          }));
        }
      }
    }

    return Object.freeze(photos);
  }

  /**
   * Checks whether an operation exists in the queue.
   */
  async hasOperation(operationId: string): Promise<boolean> {
    const current = await this.listPending();
    return current.some((op) => op.operationId === operationId);
  }

  /**
   * Returns current count of pending operations.
   */
  async size(): Promise<number> {
    const current = await this.listPending();
    return current.length;
  }

  /**
   * Clears all pending operations.
   */
  async clear(): Promise<void> {
    await this.store.removeItem(this.storageKey);
  }

  private async persist(operations: readonly StoredPendingOperation[]): Promise<void> {
    await this.store.setItem(this.storageKey, JSON.stringify(operations));
  }
}
