const LOCK_NAME = 'cw-active-call-lock';

let ownerByThisTab = false;
let releaseLock: (() => void) | null = null;

export async function claimCall(): Promise<boolean> {
  if (ownerByThisTab) return true;
  return new Promise<boolean>((resolveClaim) => {
    void navigator.locks.request(
      LOCK_NAME,
      { ifAvailable: true },
      async (lock) => {
        if (!lock) {
          resolveClaim(false);
          return;
        }
        ownerByThisTab = true;
        resolveClaim(true);
        await new Promise<void>((resolveRelease) => {
          releaseLock = resolveRelease;
        });
        ownerByThisTab = false;
        releaseLock = null;
      },
    );
  });
}

export function releaseCall(): void {
  if (!ownerByThisTab) return;
  ownerByThisTab = false;
  releaseLock?.();
  releaseLock = null;
}

export async function isCallOwnedByOtherTab(): Promise<boolean> {
  if (ownerByThisTab) return false;
  try {
    const state = await navigator.locks.query();
    return Boolean(state.held?.some((l) => l.name === LOCK_NAME));
  } catch {
    return false;
  }
}
