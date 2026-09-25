import * as SecureStore from 'expo-secure-store';

import type { SecureSessionStore, StoredSession } from '../application/ports/SecureSessionStore';

export const SESSION_STORAGE_KEY = 'campusops.session.v1';

export type SecureStoreClient = Readonly<{
  getItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<string | null>;
  setItemAsync(key: string, value: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
  deleteItemAsync(key: string, options?: SecureStore.SecureStoreOptions): Promise<void>;
}>;

const secureStoreOptions: SecureStore.SecureStoreOptions = {
  // Prevents iOS from migrating session secrets to a different device through backups.
  keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
};

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStoredSession(value: unknown): value is StoredSession {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return isNonEmptyString(candidate.accessToken)
    && isNonEmptyString(candidate.refreshToken)
    && typeof candidate.expiresAt === 'number'
    && Number.isSafeInteger(candidate.expiresAt)
    && candidate.expiresAt > 0;
}

function copySession(session: StoredSession): StoredSession {
  if (!isStoredSession(session)) throw new Error('Cannot persist an invalid session');
  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    expiresAt: session.expiresAt,
  };
}

/** Persists session secrets in the operating system protected store, never in AsyncStorage. */
export class ExpoSecureSessionStore implements SecureSessionStore {
  constructor(private readonly secureStore: SecureStoreClient = SecureStore) {}

  async load(): Promise<StoredSession | null> {
    try {
      const serialized = await this.secureStore.getItemAsync(SESSION_STORAGE_KEY, secureStoreOptions);
      if (serialized === null) return null;

      const parsed: unknown = JSON.parse(serialized);
      if (!isStoredSession(parsed)) {
        await this.clear();
        return null;
      }
      return copySession(parsed);
    } catch {
      // A malformed or unavailable protected record is treated as an expired session.
      // Deliberately do not log serialized values or platform error details.
      return null;
    }
  }

  async save(session: StoredSession): Promise<void> {
    const minimalSession = copySession(session);
    await this.secureStore.setItemAsync(
      SESSION_STORAGE_KEY,
      JSON.stringify(minimalSession),
      secureStoreOptions,
    );
  }

  async clear(): Promise<void> {
    await this.secureStore.deleteItemAsync(SESSION_STORAGE_KEY, secureStoreOptions);
  }
}
