import { act, renderHook } from '@testing-library/preact';

import { eventBus, WidgetEvent } from './eventBus';
import { widgetState } from './stores/widgetStore';
import { resetWidgetState } from './test/resetWidgetState';
import { CallState } from './types/types';
import {
  callStatus,
  formatDuration,
  getCallStateLabel,
  handleWidgetError,
  MUTE_NOTIFICATION_DURATION,
  muteNotification,
  useLocalTime,
} from './utils';

beforeEach(() => {
  resetWidgetState();
  vi.clearAllMocks();
});

describe('handleWidgetError', () => {
  it('uses the Error message when given an Error instance', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleWidgetError('fallback message', new Error('boom'));
    expect(widgetState.error).toBe('boom');
    expect(widgetState.screen).toBe('error');
    errorSpy.mockRestore();
  });

  it('uses the fallback message when the error is not an Error instance', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleWidgetError('fallback message', 'a plain string');
    expect(widgetState.error).toBe('fallback message');
    errorSpy.mockRestore();
  });

  it('uses the fallback message when no error is passed', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    handleWidgetError('fallback only');
    expect(widgetState.error).toBe('fallback only');
    expect(errorSpy).toHaveBeenCalledWith('[Widget]', 'fallback only');
    errorSpy.mockRestore();
  });

  it('clears any existing notification and emits an Error event', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const emitSpy = vi.spyOn(eventBus, 'emit');
    widgetState.notification = 'something';
    handleWidgetError('fallback', new Error('kaboom'));
    expect(widgetState.notification).toBeNull();
    expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.Error, {
      message: 'kaboom',
    });
    errorSpy.mockRestore();
  });

  it('does not overwrite the error when already on the error screen', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    widgetState.screen = 'error';
    widgetState.error = 'first error';
    const emitSpy = vi.spyOn(eventBus, 'emit');
    handleWidgetError('fallback', new Error('second error'));
    expect(widgetState.error).toBe('first error');
    expect(emitSpy).not.toHaveBeenCalledWith(
      WidgetEvent.Error,
      expect.anything(),
    );
    errorSpy.mockRestore();
  });
});

describe('useLocalTime', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns a HH:MM local time string for a resolvable country code', () => {
    const { result } = renderHook(() => useLocalTime('DE'));
    expect(result.current).toMatch(/^\d{2}:\d{2}$/);
  });

  it('returns "-" for a country code that resolves to no timezone', () => {
    const { result } = renderHook(() => useLocalTime('not-a-country'));
    expect(result.current).toBe('-');
  });

  it('refreshes the time on the one-second interval', async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:00Z').getTime());
    const { result } = renderHook(() => useLocalTime('GB'));
    const first = result.current;
    expect(first).toMatch(/^\d{2}:\d{2}$/);
    vi.setSystemTime(new Date('2024-01-01T11:30:00Z').getTime());
    await act(() => {
      vi.advanceTimersByTime(1000);
    });
    expect(result.current).not.toBe(first);
  });

  it('does not start an interval when the country is unresolvable', () => {
    vi.useFakeTimers();
    const setIntervalSpy = vi.spyOn(globalThis, 'setInterval');
    renderHook(() => useLocalTime('zz-invalid'));
    expect(setIntervalSpy).not.toHaveBeenCalled();
  });

  it('clears the interval on unmount', () => {
    vi.useFakeTimers();
    const clearSpy = vi.spyOn(globalThis, 'clearInterval');
    const { unmount } = renderHook(() => useLocalTime('FR'));
    unmount();
    expect(clearSpy).toHaveBeenCalled();
  });

  it('returns "-" for an unknown country code (no mapped timezone)', () => {
    const { result } = renderHook(() => useLocalTime('XX'));
    expect(result.current).toBe('-');
  });
});

describe('formatDuration', () => {
  it('formats zero seconds as 00:00:00', () => {
    expect(formatDuration(0)).toBe('00:00:00');
  });

  it('formats seconds only', () => {
    expect(formatDuration(5)).toBe('00:00:05');
  });

  it('formats minutes and seconds', () => {
    expect(formatDuration(155)).toBe('00:02:35');
  });

  it('formats hours, minutes and seconds', () => {
    expect(formatDuration(3661)).toBe('01:01:01');
  });

  it('pads hours beyond a single digit correctly', () => {
    expect(formatDuration(36000)).toBe('10:00:00');
  });
});

describe('getCallStateLabel', () => {
  it.each([
    [CallState.Calling, 'Calling...'],
    [CallState.Ringing, 'Ringing'],
    [CallState.Connected, 'Call Duration:'],
    [CallState.OnHold, 'On Hold'],
    [CallState.Ended, 'Call Ended'],
    [CallState.Failed, 'Call Failed'],
  ])('maps %s to "%s"', (state, label) => {
    expect(getCallStateLabel(state)).toBe(label);
  });

  it('falls back to "Reconnecting..." for unknown states (e.g. Idle)', () => {
    expect(getCallStateLabel(CallState.Idle)).toBe('Reconnecting...');
  });
});

describe('muteNotification effect', () => {
  afterEach(() => {
    vi.useRealTimers();
    widgetState.isMicMuted = false;
  });

  it('hides the notification while the mic is not muted', () => {
    widgetState.isMicMuted = false;
    expect(muteNotification.visible).toBe(false);
  });

  it('shows the notification and resets the countdown when the mic is muted', () => {
    vi.useFakeTimers();
    widgetState.isMicMuted = true;
    expect(muteNotification.visible).toBe(true);
    expect(muteNotification.countdown).toBe(MUTE_NOTIFICATION_DURATION);
  });

  it('counts down each second and hides once the countdown reaches zero', () => {
    vi.useFakeTimers();
    widgetState.isMicMuted = true;
    vi.advanceTimersByTime(1000);
    expect(muteNotification.countdown).toBe(MUTE_NOTIFICATION_DURATION - 1);
    vi.advanceTimersByTime(MUTE_NOTIFICATION_DURATION * 1000);
    expect(muteNotification.visible).toBe(false);
  });

  it('clears the running interval when the mic is unmuted before the countdown ends', () => {
    vi.useFakeTimers();
    widgetState.isMicMuted = true;
    vi.advanceTimersByTime(1000);
    widgetState.isMicMuted = false;
    expect(muteNotification.visible).toBe(false);
  });
});

describe('callStatus effect', () => {
  afterEach(() => {
    vi.useRealTimers();
    widgetState.callState = CallState.Idle;
    widgetState.startCallTime = null;
  });

  it('clears the duration for inactive states such as Idle', () => {
    widgetState.callState = CallState.Idle;
    expect(callStatus.label).toBe('Reconnecting...');
    expect(callStatus.duration).toBeNull();
  });

  it('clears the duration for an active state that has no startCallTime', () => {
    widgetState.startCallTime = null;
    widgetState.callState = CallState.Ringing;
    expect(callStatus.label).toBe('Ringing');
    expect(callStatus.duration).toBeNull();
  });

  it('ticks the duration once per second while connected', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z').getTime();
    vi.setSystemTime(now);
    widgetState.startCallTime = now - 5000;
    widgetState.callState = CallState.Connected;
    expect(callStatus.duration).toBe('00:00:05');
    vi.advanceTimersByTime(1000);
    expect(callStatus.duration).toBe('00:00:06');
  });

  it('stops ticking once the state becomes inactive', () => {
    vi.useFakeTimers();
    const now = new Date('2024-01-01T00:00:00Z').getTime();
    vi.setSystemTime(now);
    widgetState.startCallTime = now;
    widgetState.callState = CallState.Connected;
    expect(callStatus.duration).not.toBeNull();
    widgetState.callState = CallState.Ended;
    expect(callStatus.label).toBe('Call Ended');
    expect(callStatus.duration).toBeNull();
  });
});
