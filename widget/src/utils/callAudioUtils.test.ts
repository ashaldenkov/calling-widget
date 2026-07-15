import type { RefObject } from 'preact';

import {
  getAudioContext,
  ensureAudioContext,
  createUnlockAudioElement,
} from './callAudioUtils';

const makeRef = <T>(current: T | null = null): RefObject<T> => ({ current });

/** Minimal AudioContext stub that records construction and state. */
class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  state: string;
  constructor() {
    this.state = 'running';
    FakeAudioContext.instances.push(this);
  }
}

beforeEach(() => {
  vi.clearAllMocks();
  FakeAudioContext.instances = [];
});

describe('getAudioContext', () => {
  it('uses the standard AudioContext when available', () => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('webkitAudioContext', undefined);

    const ctx = getAudioContext();

    expect(ctx).toBeInstanceOf(FakeAudioContext);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('falls back to webkitAudioContext on Safari when AudioContext is absent', () => {
    class WebkitCtx extends FakeAudioContext {}
    vi.stubGlobal('AudioContext', undefined);
    vi.stubGlobal('webkitAudioContext', WebkitCtx);

    const ctx = getAudioContext();

    expect(ctx).toBeInstanceOf(WebkitCtx);
  });
});

describe('ensureAudioContext', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', FakeAudioContext);
    vi.stubGlobal('webkitAudioContext', undefined);
  });

  it('creates a fresh context when the ref is empty', () => {
    const contextRef = makeRef<AudioContext>(null);
    const sourceRef = makeRef<MediaStreamAudioSourceNode>(null);

    const ctx = ensureAudioContext(contextRef, sourceRef);

    expect(ctx).toBeInstanceOf(FakeAudioContext);
    expect(contextRef.current).toBe(ctx);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('reuses an existing, non-closed context', () => {
    const existing = new FakeAudioContext() as unknown as AudioContext;
    FakeAudioContext.instances = [];
    const contextRef = makeRef<AudioContext>(existing);
    const sourceRef = makeRef<MediaStreamAudioSourceNode>(null);

    const ctx = ensureAudioContext(contextRef, sourceRef);

    expect(ctx).toBe(existing);
    expect(FakeAudioContext.instances).toHaveLength(0);
  });

  it('discards a closed context and creates a new one', () => {
    const closed = new FakeAudioContext();
    closed.state = 'closed';
    FakeAudioContext.instances = [];
    const contextRef = makeRef<AudioContext>(closed as unknown as AudioContext);
    const sourceRef = makeRef<MediaStreamAudioSourceNode>(null);

    const ctx = ensureAudioContext(contextRef, sourceRef);

    expect(ctx).not.toBe(closed as unknown as AudioContext);
    expect(ctx).toBeInstanceOf(FakeAudioContext);
    expect(contextRef.current).toBe(ctx);
    expect(FakeAudioContext.instances).toHaveLength(1);
  });

  it('disconnects and clears an existing source node', () => {
    const disconnect = vi.fn();
    const contextRef = makeRef<AudioContext>(null);
    const sourceRef = makeRef<MediaStreamAudioSourceNode>({
      disconnect,
    } as unknown as MediaStreamAudioSourceNode);

    ensureAudioContext(contextRef, sourceRef);

    expect(disconnect).toHaveBeenCalledOnce();
    expect(sourceRef.current).toBeNull();
  });

  it('reuses context and clears source in the same call', () => {
    const existing = new FakeAudioContext() as unknown as AudioContext;
    FakeAudioContext.instances = [];
    const disconnect = vi.fn();
    const contextRef = makeRef<AudioContext>(existing);
    const sourceRef = makeRef<MediaStreamAudioSourceNode>({
      disconnect,
    } as unknown as MediaStreamAudioSourceNode);

    const ctx = ensureAudioContext(contextRef, sourceRef);

    expect(ctx).toBe(existing);
    expect(disconnect).toHaveBeenCalledOnce();
    expect(sourceRef.current).toBeNull();
    expect(FakeAudioContext.instances).toHaveLength(0);
  });
});

describe('createUnlockAudioElement', () => {
  let play: ReturnType<typeof vi.fn>;

  const stubAudio = (playImpl: () => Promise<void>) => {
    play = vi.fn(playImpl);
    const localPlay = play;
    class FakeAudio {
      muted = false;
      srcObject: MediaStream | null = null;
      play = localPlay;
    }
    vi.stubGlobal('Audio', FakeAudio);
    return FakeAudio;
  };

  it('creates a muted audio element, attaches the stream, and plays it', () => {
    stubAudio(() => Promise.resolve());
    const stream = {} as MediaStream;
    const unlockAudioRef = makeRef<HTMLAudioElement>(null);

    createUnlockAudioElement(stream, unlockAudioRef);

    const el = unlockAudioRef.current as unknown as {
      muted: boolean;
      srcObject: MediaStream | null;
    };
    expect(el).not.toBeNull();
    expect(el.muted).toBe(true);
    expect(el.srcObject).toBe(stream);
    expect(play).toHaveBeenCalledOnce();
  });

  it('tears down a previous unlock audio element before creating a new one', () => {
    stubAudio(() => Promise.resolve());
    const previous = { srcObject: {} } as unknown as HTMLAudioElement;
    const unlockAudioRef = makeRef<HTMLAudioElement>(previous);

    createUnlockAudioElement({} as MediaStream, unlockAudioRef);

    const prev = previous as unknown as { srcObject: unknown };
    expect(prev.srcObject).toBeNull();
    expect(unlockAudioRef.current).not.toBe(previous);
  });

  it('swallows a rejected play() promise', async () => {
    stubAudio(() => Promise.reject(new Error('NotAllowedError')));
    const unlockAudioRef = makeRef<HTMLAudioElement>(null);

    expect(() =>
      createUnlockAudioElement({} as MediaStream, unlockAudioRef),
    ).not.toThrow();

    // Let the rejected promise settle through the .catch handler.
    await Promise.resolve();
    expect(play).toHaveBeenCalledOnce();
  });
});
