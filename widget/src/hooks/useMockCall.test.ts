import { act, renderHook } from '@testing-library/preact';

import { ERR_MIC_PERMISSION } from '../errors';
import { widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import { CallState } from '../types/types';

import { type MockCallEvent, useMockCall } from './useMockCall';

class FakeAudioContext {
  state = 'running';
  destination = {};
  createMediaStreamSource = vi.fn(() => ({
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  createDelay = vi.fn(() => ({
    delayTime: { value: 0 },
    connect: vi.fn(),
    disconnect: vi.fn(),
  }));
  resume = vi.fn().mockResolvedValue(undefined);
  close = vi.fn().mockResolvedValue(undefined);
}

let micTrack: {
  enabled: boolean;
  kind: string;
  stop: ReturnType<typeof vi.fn>;
  onended: (() => void) | null;
};
let getUserMedia: ReturnType<typeof vi.fn>;

const makeStream = () => {
  micTrack = { enabled: true, kind: 'audio', stop: vi.fn(), onended: null };
  return {
    getAudioTracks: () => [micTrack],
    getTracks: () => [micTrack],
  } as unknown as MediaStream;
};

beforeEach(() => {
  resetWidgetState();
  vi.useFakeTimers();
  vi.stubGlobal('AudioContext', FakeAudioContext);
  vi.stubGlobal('webkitAudioContext', undefined);
  getUserMedia = vi.fn().mockResolvedValue(makeStream());
  vi.stubGlobal('navigator', {
    mediaDevices: { getUserMedia },
  });
  vi.spyOn(window.HTMLMediaElement.prototype, 'play').mockResolvedValue(
    undefined,
  );
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('useMockCall', () => {
  it('captures the mic and progresses Ringing -> Connected', async () => {
    const events: MockCallEvent[] = [];
    const { result } = renderHook(() =>
      useMockCall({ onEvent: (e) => events.push(e) }),
    );

    await act(async () => {
      await result.current.makeCall();
    });
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });

    await act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(events.at(-1)?.state).toBe(CallState.Ringing);

    await act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(events.at(-1)?.state).toBe(CallState.Connected);
    // Loopback wired up
    expect(micTrack.enabled).toBe(true);
  });

  it('hangUp stops the mic and emits Ended', async () => {
    const events: MockCallEvent[] = [];
    const { result } = renderHook(() =>
      useMockCall({ onEvent: (e) => events.push(e) }),
    );

    await act(async () => {
      await result.current.makeCall();
    });
    await act(() => {
      vi.advanceTimersByTime(3000);
    });
    await act(async () => {
      await result.current.hangUp();
    });

    expect(micTrack.stop).toHaveBeenCalled();
    expect(events.at(-1)?.state).toBe(CallState.Ended);
  });

  it('emits Failed with the mic-permission message when getUserMedia rejects', async () => {
    getUserMedia.mockRejectedValueOnce(new Error('denied'));
    const events: MockCallEvent[] = [];
    const { result } = renderHook(() =>
      useMockCall({ onEvent: (e) => events.push(e) }),
    );

    await act(async () => {
      await result.current.makeCall();
    });

    expect(events.at(-1)).toMatchObject({
      state: CallState.Failed,
      message: ERR_MIC_PERMISSION,
    });
  });

  it('toggling isMicMuted disables the live mic track', async () => {
    const { result } = renderHook(() => useMockCall({}));
    await act(async () => {
      await result.current.makeCall();
    });

    await act(() => {
      widgetState.isMicMuted = true;
    });
    expect(micTrack.enabled).toBe(false);

    await act(() => {
      widgetState.isMicMuted = false;
    });
    expect(micTrack.enabled).toBe(true);
  });
});
