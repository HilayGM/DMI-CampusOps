export type SessionPhase = 'anonymous' | 'authenticating' | 'authenticated' | 'refreshing';

export type SessionLifecycleEvent = Readonly<{
  type:
    | 'loginStarted' | 'loginSucceeded' | 'loginFailed' | 'sessionExpired'
    | 'request401' | 'refreshSucceeded' | 'refreshFailed' | 'logout';
  requestId?: string;
  generation?: number;
  token?: string;
}>;

export type SessionRefreshSnapshot = Readonly<{
  phase: SessionPhase;
  activeGeneration: number | null;
  refreshCalls: number;
  retriedRequestIds: readonly string[];
  persistedToken: string | null;
}>;

export type SessionClock = Readonly<{ now: () => number }>;

function validGeneration(value: unknown): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
}

function validToken(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

/**
 * Application state machine shared by the session client and the public
 * course adapter. It never retains refresh tokens or raw transport errors.
 */
export class SessionRefreshCoordinator {
  private phase: SessionPhase = 'anonymous';
  private activeGeneration: number | null = null;
  private refreshCalls = 0;
  private persistedToken: string | null = null;
  private readonly waitingRequestIds = new Set<string>();
  private readonly retriedRequestIds = new Set<string>();

  apply(event: SessionLifecycleEvent): void {
    switch (event.type) {
      case 'loginStarted':
        this.reset('authenticating');
        return;
      case 'loginSucceeded':
        if (validGeneration(event.generation) && validToken(event.token)) {
          this.phase = 'authenticated';
          this.activeGeneration = event.generation;
          this.persistedToken = event.token;
        } else {
          this.reset('anonymous');
        }
        return;
      case 'loginFailed':
      case 'refreshFailed':
      case 'logout':
        this.reset('anonymous');
        return;
      case 'sessionExpired':
        if (this.phase === 'authenticated' && event.generation === this.activeGeneration) {
          this.startRefresh();
        }
        return;
      case 'request401':
        this.handle401(event);
        return;
      case 'refreshSucceeded':
        this.completeRefresh(event);
        return;
    }
  }

  applyAll(events: readonly SessionLifecycleEvent[]): SessionRefreshSnapshot {
    for (const event of events) this.apply(event);
    return this.snapshot();
  }

  /** Uses an injected clock so expiry tests never depend on elapsed wall time. */
  expireIfNeeded(expiresAt: number, clock: SessionClock): boolean {
    if (
      this.phase !== 'authenticated' || this.activeGeneration === null
      || !Number.isSafeInteger(expiresAt) || clock.now() < expiresAt
    ) {
      return false;
    }
    this.apply({ type: 'sessionExpired', generation: this.activeGeneration });
    return true;
  }

  snapshot(): SessionRefreshSnapshot {
    return Object.freeze({
      phase: this.phase,
      activeGeneration: this.activeGeneration,
      refreshCalls: this.refreshCalls,
      retriedRequestIds: Object.freeze([...this.retriedRequestIds]),
      persistedToken: this.persistedToken,
    });
  }

  private handle401(event: SessionLifecycleEvent): void {
    if (!validGeneration(event.generation)) return;
    if (this.phase === 'refreshing') {
      if (event.generation === this.activeGeneration) this.rememberWaitingRequest(event.requestId);
      return;
    }
    if (this.phase === 'authenticated' && event.generation !== this.activeGeneration) return;
    if (this.phase === 'authenticated' && this.wasAlreadyRetried(event.requestId)) return;

    this.activeGeneration = event.generation;
    this.rememberWaitingRequest(event.requestId);
    this.startRefresh();
  }

  private completeRefresh(event: SessionLifecycleEvent): void {
    const nextGeneration = this.activeGeneration === null ? null : this.activeGeneration + 1;
    if (this.phase !== 'refreshing' || nextGeneration === null || event.generation !== nextGeneration) return;
    if (!validToken(event.token)) {
      this.reset('anonymous');
      return;
    }
    this.phase = 'authenticated';
    this.activeGeneration = event.generation;
    this.persistedToken = event.token;
    for (const requestId of this.waitingRequestIds) this.retriedRequestIds.add(requestId);
    this.waitingRequestIds.clear();
  }

  private startRefresh(): void {
    this.phase = 'refreshing';
    this.refreshCalls += 1;
  }

  private rememberWaitingRequest(requestId: string | undefined): void {
    if (typeof requestId === 'string' && requestId.trim().length > 0) {
      this.waitingRequestIds.add(requestId);
    }
  }

  private wasAlreadyRetried(requestId: string | undefined): boolean {
    return typeof requestId === 'string' && this.retriedRequestIds.has(requestId);
  }

  private reset(phase: Extract<SessionPhase, 'anonymous' | 'authenticating'>): void {
    this.phase = phase;
    this.activeGeneration = null;
    this.persistedToken = null;
    this.waitingRequestIds.clear();
    this.retriedRequestIds.clear();
  }
}
