import { planRetry } from '../index';

describe('week 09 retry planning', () => {
  it('uses finite progressive backoff and stops at attempt four', () => {
    const delays = [1, 2, 3].map((attempt) => {
      const plan = planRetry({ method: 'GET', status: 'timeout', attempt });
      expect(plan.retry).toBe(true);
      if (!plan.retry) throw new Error('Expected a retry plan before the attempt limit');
      return plan.delayMs;
    });

    expect(delays).toEqual([1_000, 2_000, 4_000]);
    expect(delays.every(Number.isFinite)).toBe(true);
    expect(planRetry({ method: 'GET', status: 'timeout', attempt: 4 })).toEqual({ retry: false });
  });

  it('honors Retry-After exactly for 429 responses', () => {
    expect(planRetry({
      method: 'GET',
      status: 429,
      attempt: 1,
      retryAfterMs: 800,
    })).toEqual({
      retry: true,
      delayMs: 800,
      requiresStableIdempotencyKey: false,
    });
  });

  it('rejects POST retries without a stable idempotency key', () => {
    expect(planRetry({ method: 'POST', status: 503, attempt: 1 })).toEqual({
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: true,
    });
  });

  it('allows an idempotent POST and does not retry non-transient responses', () => {
    expect(planRetry({
      method: 'POST',
      status: 'timeout',
      attempt: 1,
      idempotencyKey: 'operation-123',
    })).toEqual({
      retry: true,
      delayMs: 1_000,
      requiresStableIdempotencyKey: false,
    });
    expect(planRetry({ method: 'GET', status: 400, attempt: 1 })).toEqual({
      retry: false,
      delayMs: 0,
      requiresStableIdempotencyKey: false,
    });
  });
});
