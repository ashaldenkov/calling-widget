import { probeMicPermission } from './micPermission';

const setGetUserMedia = (impl: (constraints?: unknown) => Promise<unknown>) => {
  Object.defineProperty(navigator, 'mediaDevices', {
    configurable: true,
    value: { getUserMedia: vi.fn(impl) },
  });
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('probeMicPermission', () => {
  it("returns 'granted' and stops every track when getUserMedia resolves a stream", async () => {
    const stop1 = vi.fn();
    const stop2 = vi.fn();
    const stream = {
      getTracks: () => [{ stop: stop1 }, { stop: stop2 }],
    };
    setGetUserMedia(() => Promise.resolve(stream));

    await expect(probeMicPermission()).resolves.toBe('granted');
    expect(stop1).toHaveBeenCalledOnce();
    expect(stop2).toHaveBeenCalledOnce();
  });

  it("returns 'denied' for a NotAllowedError DOMException", async () => {
    setGetUserMedia(() =>
      Promise.reject(new DOMException('nope', 'NotAllowedError')),
    );
    await expect(probeMicPermission()).resolves.toBe('denied');
  });

  it("returns 'denied' for a SecurityError DOMException", async () => {
    setGetUserMedia(() =>
      Promise.reject(new DOMException('nope', 'SecurityError')),
    );
    await expect(probeMicPermission()).resolves.toBe('denied');
  });

  it("returns 'noDevice' for a NotFoundError DOMException", async () => {
    setGetUserMedia(() =>
      Promise.reject(new DOMException('nope', 'NotFoundError')),
    );
    await expect(probeMicPermission()).resolves.toBe('noDevice');
  });

  it("returns 'noDevice' for a DevicesNotFoundError DOMException", async () => {
    setGetUserMedia(() =>
      Promise.reject(new DOMException('nope', 'DevicesNotFoundError')),
    );
    await expect(probeMicPermission()).resolves.toBe('noDevice');
  });

  it("returns 'failed' for a plain Error", async () => {
    setGetUserMedia(() => Promise.reject(new Error('boom')));
    await expect(probeMicPermission()).resolves.toBe('failed');
  });

  it("returns 'failed' for an unrecognized DOMException (AbortError)", async () => {
    setGetUserMedia(() =>
      Promise.reject(new DOMException('nope', 'AbortError')),
    );
    await expect(probeMicPermission()).resolves.toBe('failed');
  });

  it("re-probes live: reports 'noDevice' with no mic, then 'granted' once a mic is plugged in", async () => {
    const stop = vi.fn();
    const stream = { getTracks: () => [{ stop }] };
    let attempt = 0;
    // Simulate a mic that is absent on the first probe and present on the next.
    setGetUserMedia(() => {
      attempt += 1;
      return attempt === 1
        ? Promise.reject(new DOMException('no mic', 'NotFoundError'))
        : Promise.resolve(stream);
    });

    await expect(probeMicPermission()).resolves.toBe('noDevice');
    // A fresh probe reflects the now-connected device rather than a cached result.
    await expect(probeMicPermission()).resolves.toBe('granted');
    expect(stop).toHaveBeenCalledOnce();
  });
});
