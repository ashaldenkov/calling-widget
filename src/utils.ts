import { getTimezonesForCountry } from 'countries-and-timezones';
import type { TCountryCode } from 'countries-list';
import { useEffect, useMemo, useState } from 'react';

import { eventBus, WidgetEvent } from './eventBus';
import { useWidgetStore } from './stores/widgetStore';
import { CallState } from './types/types';

export const getErrorMessage = (
  error: unknown,
  fallback = 'Unknown error',
): string => (error instanceof Error ? error.message : fallback);

export const handleWidgetError = (message: string, error?: unknown): void => {
  console.error('[Widget]', error ?? message);
  const store = useWidgetStore.getState();
  if (store.screen !== 'error') {
    store.setNotification(null);
    store.setError(message);
    store.setScreen('error');
    eventBus.emit(WidgetEvent.Error, { message });
  }
};

const formatLocalTime = (timezone: string): string => {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: timezone,
    }).format(new Date());
  } catch {
    return '-';
  }
};

const getTimezone = (countryCode: TCountryCode): string | null => {
  const timezones = getTimezonesForCountry(countryCode.toUpperCase());
  return timezones?.[0]?.name ?? null;
};

export const useLocalTime = (countryCode: TCountryCode): string => {
  const timezone = useMemo(() => getTimezone(countryCode), [countryCode]);

  const [localTime, setLocalTime] = useState(() =>
    timezone ? formatLocalTime(timezone) : '-',
  );

  useEffect(() => {
    if (!timezone) return;

    setLocalTime(formatLocalTime(timezone));

    const interval = setInterval(() => {
      setLocalTime(formatLocalTime(timezone));
    }, 1000);

    return () => clearInterval(interval);
  }, [timezone]);

  return localTime;
};

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const mm = m.toString().padStart(2, '0');
  const ss = s.toString().padStart(2, '0');
  return `${h.toString().padStart(2, '0')}:${mm}:${ss}`;
};

export const getCallStateLabel = (callState: CallState): string => {
  switch (callState) {
    case CallState.Calling:
      return 'Calling...';
    case CallState.Ringing:
      return 'Ringing';
    case CallState.Connected:
      return 'Call Duration:';
    case CallState.OnHold:
      return 'On Hold';
    case CallState.Ended:
      return 'Call Ended';
    case CallState.Failed:
      return 'Call Failed';
    default:
      return 'Reconnecting...';
  }
};

export const MUTE_NOTIFICATION_DURATION = 5;

export const useMuteNotification = () => {
  const { isMicMuted } = useWidgetStore();
  const [visible, setVisible] = useState(false);
  const [countdown, setCountdown] = useState(MUTE_NOTIFICATION_DURATION);

  useEffect(() => {
    if (!isMicMuted) {
      setVisible(false);
      return;
    }

    setVisible(true);
    let remaining = MUTE_NOTIFICATION_DURATION;
    setCountdown(remaining);

    const interval = setInterval(() => {
      remaining -= 1;
      setCountdown(remaining);
      if (remaining <= 0) {
        clearInterval(interval);
        setVisible(false);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isMicMuted]);

  return { visible, countdown };
};

export const useCallStatus = () => {
  const { callState, startCallTime } = useWidgetStore();
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const isCallActive = useMemo(
    () =>
      callState !== CallState.Idle &&
      callState !== CallState.Ended &&
      callState !== CallState.Failed,
    [callState],
  );

  useEffect(() => {
    if (!isCallActive || !startCallTime) {
      setElapsedSeconds(0);
      return;
    }

    setElapsedSeconds(Math.floor((Date.now() - startCallTime) / 1000));

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startCallTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [isCallActive, startCallTime]);

  const label = getCallStateLabel(callState);
  const duration = startCallTime ? formatDuration(elapsedSeconds) : null;

  return { label, duration };
};
