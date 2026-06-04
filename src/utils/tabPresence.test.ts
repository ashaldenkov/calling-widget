// tabPresence.ts has module-level state (ownerByThisTab, releaseLock).
// vi.resetModules() in beforeEach gives each test a fresh module instance

const LOCK_NAME = 'cw-active-call-lock';

type LockGrantCallback = (
  lock: { name: string; mode: string } | null,
) => Promise<void>;

function setupLocks({
  grantLock = true,
  heldLocks = [] as Array<{ name: string }>,
} = {}) {
  const requestFn = vi
    .fn()
    .mockImplementation(
      (_name: string, _opts: unknown, callback: LockGrantCallback) => {
        // Call the callback but do not await it — simulates the browser
        // granting (or denying) the lock without blocking the mock itself.
        void callback(
          grantLock ? { name: LOCK_NAME, mode: 'exclusive' } : null,
        );
        return Promise.resolve();
      },
    );
  const queryFn = vi.fn().mockResolvedValue({ held: heldLocks });

  Object.defineProperty(navigator, 'locks', {
    value: { request: requestFn, query: queryFn },
    configurable: true,
    writable: true,
  });

  return { requestFn, queryFn };
}

beforeEach(() => {
  vi.resetModules();
});

describe('isCallOwnedByOtherTab', () => {
  it('returns false when no lock is held by anyone', async () => {
    setupLocks({ heldLocks: [] });
    const { isCallOwnedByOtherTab } = await import('./tabPresence');
    expect(await isCallOwnedByOtherTab()).toBe(false);
  });

  it('returns true when the call lock is held (by another tab)', async () => {
    setupLocks({ heldLocks: [{ name: LOCK_NAME }] });
    const { isCallOwnedByOtherTab } = await import('./tabPresence');
    expect(await isCallOwnedByOtherTab()).toBe(true);
  });

  it('returns false when a different lock is held — lock name must match exactly', async () => {
    setupLocks({ heldLocks: [{ name: 'some-unrelated-lock' }] });
    const { isCallOwnedByOtherTab } = await import('./tabPresence');
    expect(await isCallOwnedByOtherTab()).toBe(false);
  });

  it('returns false when this tab already owns the lock — short-circuits without querying the browser', async () => {
    const { queryFn } = setupLocks({
      grantLock: true,
      heldLocks: [{ name: LOCK_NAME }],
    });
    const { claimCall, isCallOwnedByOtherTab } = await import('./tabPresence');
    await claimCall(); // this tab now owns the lock
    const callsBefore = queryFn.mock.calls.length;
    expect(await isCallOwnedByOtherTab()).toBe(false);
    // No additional query call — ownerByThisTab short-circuits it
    expect(queryFn.mock.calls.length).toBe(callsBefore);
  });

  it('returns false (fail-open) when the Locks API throws — do not block the user', async () => {
    const queryFn = vi.fn().mockRejectedValue(new Error('API unavailable'));
    Object.defineProperty(navigator, 'locks', {
      value: { request: vi.fn(), query: queryFn },
      configurable: true,
      writable: true,
    });
    const { isCallOwnedByOtherTab } = await import('./tabPresence');
    expect(await isCallOwnedByOtherTab()).toBe(false);
  });
});

describe('claimCall', () => {
  it('returns true when the browser grants the lock', async () => {
    setupLocks({ grantLock: true });
    const { claimCall } = await import('./tabPresence');
    expect(await claimCall()).toBe(true);
  });

  it('returns false when the lock is unavailable (another tab holds it)', async () => {
    setupLocks({ grantLock: false });
    const { claimCall } = await import('./tabPresence');
    expect(await claimCall()).toBe(false);
  });

  it('returns true immediately on a second call without making another lock request', async () => {
    const { requestFn } = setupLocks({ grantLock: true });
    const { claimCall } = await import('./tabPresence');
    await claimCall(); // first claim acquires the lock
    const callsBefore = requestFn.mock.calls.length;
    expect(await claimCall()).toBe(true);
    // No new browser request — already owner
    expect(requestFn.mock.calls.length).toBe(callsBefore);
  });
});

describe('releaseCall', () => {
  it('does not throw when called without first claiming the lock', async () => {
    setupLocks();
    const { releaseCall } = await import('./tabPresence');
    expect(() => releaseCall()).not.toThrow();
  });

  it('after release, a new claimCall goes through the browser lock request again', async () => {
    const { requestFn } = setupLocks({ grantLock: true });
    const { claimCall, releaseCall } = await import('./tabPresence');
    await claimCall();
    releaseCall();
    const callsBefore = requestFn.mock.calls.length;
    await claimCall();
    expect(requestFn.mock.calls.length).toBeGreaterThan(callsBefore);
  });

  it('after release, isCallOwnedByOtherTab queries the API (ownerByThisTab is false)', async () => {
    const { queryFn } = setupLocks({ grantLock: true, heldLocks: [] });
    const { claimCall, releaseCall, isCallOwnedByOtherTab } = await import(
      './tabPresence'
    );
    await claimCall();
    releaseCall();
    const callsBefore = queryFn.mock.calls.length;
    await isCallOwnedByOtherTab();
    // Should have queried — no longer short-circuiting via ownerByThisTab
    expect(queryFn.mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
