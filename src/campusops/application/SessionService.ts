import type { SecureSessionStore, StoredSession } from './ports/SecureSessionStore';
import { clientFailure, isClientFailure } from './clientErrors';
import { SessionRefreshCoordinator, type SessionClock } from './SessionRefreshCoordinator';

export type SessionRequestClient = Readonly<{
  fetchProtected(input: RequestInfo | URL, init?: RequestInit): Promise<Response>;
}>;

export type SessionLifecycleClient = Readonly<{
  subscribe(listener: (authenticated: boolean) => void): () => void;
}>;

type SessionServiceOptions = Readonly<{
  baseUrl: string;
  sessionStore: SecureSessionStore;
  fetchImpl?: typeof fetch;
  clock?: SessionClock;
}>;

type ActiveSession = Readonly<{
  value: StoredSession;
  generation: number;
  epoch: number;
}>;
type RefreshFlight = Readonly<{ epoch: number; promise: Promise<StoredSession> }>;

const roles: readonly string[] = ['reporter', 'technician', 'coordinator'];

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isToken(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.trim() === value && !/\s/.test(value);
}

function isActorId(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isExpiresIn(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
}

function unauthorized() {
  return clientFailure({ kind: 'http', status: 401 });
}

export class SessionService implements SessionRequestClient {
  private readonly coordinator = new SessionRefreshCoordinator();
  private readonly clock: SessionClock;
  private active: ActiveSession | null = null;
  private epoch = 0;
  private generation = 0;
  private requestSequence = 0;
  private refreshFlight: RefreshFlight | null = null;
  private storageQueue: Promise<void> = Promise.resolve();
  private readonly listeners = new Set<(authenticated: boolean) => void>();

  constructor(private readonly options: SessionServiceOptions) {
    this.clock = options.clock ?? { now: () => Date.now() };
  }

  subscribe(listener: (authenticated: boolean) => void): () => void {
    this.listeners.add(listener);
    listener(this.active !== null);
    return () => this.listeners.delete(listener);
  }

  async restore(): Promise<boolean> {
    const epoch = ++this.epoch;
    this.active = null;
    this.refreshFlight = null;
    this.coordinator.apply({ type: 'loginStarted' });
    this.notifySessionState();

    let stored: StoredSession | null;
    try {
      stored = await this.enqueueStorageOperation(() => this.options.sessionStore.load());
    } catch {
      if (epoch !== this.epoch) return false;
      this.coordinator.apply({ type: 'loginFailed' });
      throw clientFailure({ kind: 'precondition' });
    }
    if (epoch !== this.epoch) return false;
    if (!stored) {
      this.coordinator.apply({ type: 'loginFailed' });
      return false;
    }

    const active = this.activate(stored, epoch);
    if (this.clock.now() < stored.expiresAt) return true;
    this.coordinator.expireIfNeeded(stored.expiresAt, this.clock);
    try {
      await this.startRefresh(active);
      return this.isCurrentEpoch(epoch) && this.active !== null;
    } catch (error: unknown) {
      throw isClientFailure(error) ? error : clientFailure({ kind: 'precondition' });
    }
  }

  async login(actorId: string): Promise<void> {
    if (!isActorId(actorId)) throw clientFailure({ kind: 'precondition' });
    const epoch = ++this.epoch;
    this.active = null;
    this.refreshFlight = null;
    this.coordinator.apply({ type: 'loginStarted' });
    this.notifySessionState();

    try {
      await this.enqueueStorageOperation(() => this.options.sessionStore.clear());
      if (epoch !== this.epoch) throw unauthorized();
      const input = await this.postJson('/v1/session/login', { actorId });
      const session = this.parseLogin(input, actorId);
      if (epoch !== this.epoch) throw unauthorized();
      await this.enqueueStorageOperation(async () => {
        if (epoch === this.epoch) await this.options.sessionStore.save(session);
      });
      if (epoch !== this.epoch) throw unauthorized();

      const generation = ++this.generation;
      this.coordinator.apply({
        type: 'loginSucceeded',
        generation,
        token: session.accessToken,
      });
      this.active = { value: session, generation, epoch };
      this.notifySessionState();
    } catch (error: unknown) {
      if (epoch === this.epoch) {
        this.active = null;
        this.coordinator.apply({ type: 'loginFailed' });
        this.notifySessionState();
        try {
          await this.enqueueStorageOperation(() => this.options.sessionStore.clear());
        } catch {
          throw clientFailure({ kind: 'precondition' });
        }
      }
      throw isClientFailure(error) ? error : clientFailure({ kind: 'precondition' });
    }
  }

  async logout(): Promise<void> {
    ++this.epoch;
    this.active = null;
    this.refreshFlight = null;
    this.coordinator.apply({ type: 'logout' });
    this.notifySessionState();
    try {
      await this.enqueueStorageOperation(() => this.options.sessionStore.clear());
    } catch {
      throw clientFailure({ kind: 'precondition' });
    }
  }

  async fetchProtected(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
    let active = this.active;
    if (!active) throw clientFailure({ kind: 'precondition' });

    if (this.clock.now() >= active.value.expiresAt) {
      this.coordinator.expireIfNeeded(active.value.expiresAt, this.clock);
      const fresh = await this.startRefresh(active);
      active = this.active;
      if (!active || active.value !== fresh) throw unauthorized();
    }

    const requestId = `protected-${++this.requestSequence}`;
    const response = await this.fetchWithSession(input, init, active.value);
    if (response.status !== 401) return response;

    const latest = this.active;
    if (!this.isCurrent(active)) {
      if (!this.isCurrentEpoch(active.epoch) || !latest) throw unauthorized();
      return this.fetchWithSession(input, init, latest.value);
    }

    this.coordinator.apply({
      type: 'request401',
      requestId,
      generation: active.generation,
    });
    const fresh = await this.startRefresh(active);
    if (!this.isCurrentEpoch(active.epoch) || this.active?.value !== fresh) throw unauthorized();
    return this.fetchWithSession(input, init, fresh);
  }

  private activate(value: StoredSession, epoch: number): ActiveSession {
    const generation = ++this.generation;
    this.coordinator.apply({ type: 'loginSucceeded', generation, token: value.accessToken });
    const active = { value, generation, epoch };
    this.active = active;
    this.notifySessionState();
    return active;
  }

  private startRefresh(active: ActiveSession): Promise<StoredSession> {
    const current = this.refreshFlight;
    if (current?.epoch === active.epoch) return current.promise;

    const promise = this.performRefresh(active);
    const flight = { epoch: active.epoch, promise };
    this.refreshFlight = flight;
    const clearFlight = () => {
      if (this.refreshFlight === flight) this.refreshFlight = null;
    };
    void promise.then(clearFlight, clearFlight);
    return promise;
  }

  private async performRefresh(active: ActiveSession): Promise<StoredSession> {
    try {
      const input = await this.postJson('/v1/session/refresh', {
        refreshToken: active.value.refreshToken,
      });
      const refreshed = this.parseRefresh(input, active.value.actorId);
      if (!this.isCurrent(active)) throw unauthorized();

      await this.enqueueStorageOperation(async () => {
        if (this.isCurrent(active)) await this.options.sessionStore.save(refreshed);
      });
      if (!this.isCurrent(active)) throw unauthorized();

      const generation = active.generation + 1;
      this.coordinator.apply({
        type: 'refreshSucceeded',
        generation,
        token: refreshed.accessToken,
      });
      this.generation = Math.max(this.generation, generation);
      this.active = { value: refreshed, generation, epoch: active.epoch };
      this.notifySessionState();
      return refreshed;
    } catch (error: unknown) {
      if (this.isCurrent(active)) {
        this.active = null;
        ++this.epoch;
        this.coordinator.apply({ type: 'refreshFailed' });
        this.notifySessionState();
        try {
          await this.enqueueStorageOperation(() => this.options.sessionStore.clear());
        } catch {
          throw clientFailure({ kind: 'precondition' });
        }
      }
      throw isClientFailure(error) ? error : clientFailure({ kind: 'precondition' });
    }
  }

  private async fetchWithSession(
    input: RequestInfo | URL,
    init: RequestInit,
    session: StoredSession,
  ): Promise<Response> {
    const headers = new Headers(init.headers);
    headers.set('Authorization', `Bearer ${session.accessToken}`);
    headers.set('X-Course-Actor', session.actorId);
    try {
      return await (this.options.fetchImpl ?? fetch)(input, { ...init, headers });
    } catch {
      throw init.signal?.aborted
        ? clientFailure({ kind: 'timeout' })
        : clientFailure({ kind: 'network' });
    }
  }

  private async postJson(path: string, body: Readonly<Record<string, unknown>>): Promise<unknown> {
    let response: Response;
    try {
      response = await (this.options.fetchImpl ?? fetch)(
        `${this.options.baseUrl.replace(/\/$/, '')}${path}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
      );
    } catch {
      throw clientFailure({ kind: 'network' });
    }
    if (!response.ok) throw clientFailure({ kind: 'http', status: response.status });
    try {
      return await response.json() as unknown;
    } catch {
      throw clientFailure({ kind: 'contract', reason: 'json' });
    }
  }

  private parseLogin(input: unknown, requestedActorId: string): StoredSession {
    if (!isRecord(input)
      || input.actorId !== requestedActorId
      || typeof input.role !== 'string'
      || !roles.includes(input.role)
      || !isToken(input.accessToken)
      || !isToken(input.refreshToken)
      || !isExpiresIn(input.expiresIn)) {
      throw clientFailure({ kind: 'contract', reason: 'schema' });
    }
    return {
      actorId: requestedActorId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: this.expiryFrom(input.expiresIn),
    };
  }

  private parseRefresh(input: unknown, actorId: string): StoredSession {
    if (!isRecord(input)
      || !isToken(input.accessToken)
      || !isToken(input.refreshToken)
      || !isExpiresIn(input.expiresIn)) {
      throw clientFailure({ kind: 'contract', reason: 'schema' });
    }
    return {
      actorId,
      accessToken: input.accessToken,
      refreshToken: input.refreshToken,
      expiresAt: this.expiryFrom(input.expiresIn),
    };
  }

  private expiryFrom(expiresIn: number): number {
    const now = this.clock.now();
    const expiresAt = now + expiresIn * 1_000;
    if (!Number.isSafeInteger(expiresAt) || expiresAt <= now) {
      throw clientFailure({ kind: 'contract', reason: 'schema' });
    }
    return expiresAt;
  }

  private isCurrent(active: ActiveSession): boolean {
    return this.isCurrentEpoch(active.epoch) && this.active === active;
  }

  private isCurrentEpoch(epoch: number): boolean {
    return this.epoch === epoch;
  }

  private enqueueStorageOperation<T>(operation: () => Promise<T>): Promise<T> {
    const result = this.storageQueue.then(operation);
    this.storageQueue = result.then(() => undefined, () => undefined);
    return result;
  }

  private notifySessionState(): void {
    for (const listener of this.listeners) listener(this.active !== null);
  }
}
