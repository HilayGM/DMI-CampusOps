import * as SecureStore from 'expo-secure-store';

import type { StoredSession } from '../application/ports/SecureSessionStore';
import {
  ExpoSecureSessionStore,
  SESSION_STORAGE_KEY,
  type SecureStoreClient,
} from '../infrastructure/ExpoSecureSessionStore';

const session: StoredSession = {
  accessToken: 'fictional-access-token',
  refreshToken: 'fictional-refresh-token',
  expiresAt: 1_800_000_000,
};

function createClient(): jest.Mocked<SecureStoreClient> {
  return {
    getItemAsync: jest.fn().mockResolvedValue(null),
    setItemAsync: jest.fn().mockResolvedValue(undefined),
    deleteItemAsync: jest.fn().mockResolvedValue(undefined),
  };
}

describe('ExpoSecureSessionStore', () => {
  it('stores only the minimal session in the protected platform store', async () => {
    const client = createClient();
    const store = new ExpoSecureSessionStore(client);
    const sessionWithProfile = { ...session, displayName: 'Persona ficticia' } as StoredSession;

    await store.save(sessionWithProfile);

    expect(client.setItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      JSON.stringify(session),
      expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    );
  });

  it('loads a valid protected session without exposing it to logs', async () => {
    const client = createClient();
    client.getItemAsync.mockResolvedValue(JSON.stringify(session));

    await expect(new ExpoSecureSessionStore(client).load()).resolves.toEqual(session);
  });

  it('removes a malformed protected record and returns an anonymous session', async () => {
    const client = createClient();
    client.getItemAsync.mockResolvedValue('{"accessToken":"fictional-access-token","email":"person@campusops.test"}');

    await expect(new ExpoSecureSessionStore(client).load()).resolves.toBeNull();
    expect(client.deleteItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    );
  });

  it('treats a protected-store read failure as no active session', async () => {
    const client = createClient();
    client.getItemAsync.mockRejectedValue(new Error('fictional platform failure'));

    await expect(new ExpoSecureSessionStore(client).load()).resolves.toBeNull();
  });

  it('deletes the protected record on logout', async () => {
    const client = createClient();

    await new ExpoSecureSessionStore(client).clear();

    expect(client.deleteItemAsync).toHaveBeenCalledWith(
      SESSION_STORAGE_KEY,
      expect.objectContaining({ keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY }),
    );
  });
});
