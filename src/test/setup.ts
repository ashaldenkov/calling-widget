import '@testing-library/jest-dom/vitest';

// jsdom 26 + vitest 4 may expose Storage objects that throw on access
// Replace them with simple in-memory shims so widgetStore (sessionStorage)
// and init.ts (localStorage for cw-compat-warned) work in tests.
function installMemoryStorage(key: 'sessionStorage' | 'localStorage') {
  const memory = new Map<string, string>();
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value: {
      getItem: (k: string) => memory.get(k) ?? null,
      setItem: (k: string, v: string) => {
        memory.set(k, v);
      },
      removeItem: (k: string) => {
        memory.delete(k);
      },
      clear: () => memory.clear(),
      key: (i: number) => Array.from(memory.keys())[i] ?? null,
      get length() {
        return memory.size;
      },
    },
  });
}

function isStorageWorking(key: 'sessionStorage' | 'localStorage'): boolean {
  try {
    const s = (globalThis as unknown as Record<string, Storage>)[key];
    if (!s || typeof s.setItem !== 'function') return false;
    const probe = '__cw_probe__';
    s.setItem(probe, '1');
    s.removeItem(probe);
    return true;
  } catch {
    return false;
  }
}

if (!isStorageWorking('sessionStorage')) installMemoryStorage('sessionStorage');
if (!isStorageWorking('localStorage')) installMemoryStorage('localStorage');
