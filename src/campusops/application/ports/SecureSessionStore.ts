/**
 * Session secrets only. Profile, location, incident and free-text data must not
 * be persisted with this record.
 */
export type StoredSession = Readonly<{
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
}>;

export interface SecureSessionStore {
  load(): Promise<StoredSession | null>;
  save(session: StoredSession): Promise<void>;
  clear(): Promise<void>;
}
