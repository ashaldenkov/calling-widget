import { effect } from '@preact/signals';
import { getTimezonesForCountry } from 'countries-and-timezones';
import type { TCountryCode } from 'countries-list';
import { deepSignal } from 'deepsignal';
import { useEffect, useMemo, useState } from 'preact/hooks';

import { eventBus, WidgetEvent } from './eventBus';
import {
  setError,
  setNotification,
  setScreen,
  widgetState,
} from './stores/widgetStore';
import { CallState } from './types/types';

export const getErrorMessage = (
  error: unknown,
  fallback = 'Unknown error',
): string => (error instanceof Error ? error.message : fallback);

export const handleWidgetError = (message: string, error?: unknown): void => {
  console.error('[Widget]', error ?? message);
  if (widgetState.screen !== 'error') {
    setNotification(null);
    setError(message);
    setScreen('error');
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

export const muteNotification = deepSignal({
  visible: false,
  countdown: MUTE_NOTIFICATION_DURATION,
});

effect(() => {
  const muted = widgetState.isMicMuted;
  if (!muted) {
    muteNotification.visible = false;
    return;
  }
  let remaining = MUTE_NOTIFICATION_DURATION;
  muteNotification.countdown = remaining;
  muteNotification.visible = true;

  const id = setInterval(() => {
    remaining -= 1;
    muteNotification.countdown = remaining;
    if (remaining <= 0) {
      clearInterval(id);
      muteNotification.visible = false;
    }
  }, 1000);
  return () => clearInterval(id);
});

export const callStatus = deepSignal<{
  label: string;
  duration: string | null;
}>({
  label: getCallStateLabel(CallState.Idle),
  duration: null,
});

effect(() => {
  const callState = widgetState.callState;
  const start = widgetState.startCallTime;
  const inRecovery = widgetState.recoveryStatus === 'unstable';

  if (callState === CallState.Connected && inRecovery) {
    callStatus.label = 'Connecting...';
    callStatus.duration = null;
    return;
  }

  callStatus.label = getCallStateLabel(callState);

  const isActive =
    callState !== CallState.Idle &&
    callState !== CallState.Ended &&
    callState !== CallState.Failed;

  if (!isActive || !start) {
    callStatus.duration = null;
    return;
  }

  let id: ReturnType<typeof setTimeout>;
  const tick = () => {
    const elapsed = Date.now() - start;
    callStatus.duration = formatDuration(Math.floor(elapsed / 1000));
    id = setTimeout(tick, 1000 - (elapsed % 1000));
  };
  tick();
  return () => clearTimeout(id);
});
