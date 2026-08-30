import { effect } from '@preact/signals';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import {
  ERR_MIC_DISCONNECTED,
  ERR_MIC_PERMISSION,
  getErrorMessage,
} from '../errors';
import { hangUpRef } from '../stores/callControl';
import { widgetState } from '../stores/widgetStore';
import { CallState } from '../types/types';
import {
  createUnlockAudioElement,
  ensureAudioContext,
} from '../utils/callAudioUtils';

const LOG_PREFIX = '[Mock Call]';

// Short delay on the mic loopback so the user clearly hears themselves come back
// "over the line", imitating a remote party.
const LOOPBACK_DELAY_SECONDS = 0.25;
const RINGING_DELAY_MS = 1500;
const CONNECTED_DELAY_MS = 3000;

// Silence detection: warn if the mic stays effectively silent (while not muted)
// for this long during a connected call.
const MONITOR_INTERVAL_MS = 500;
const SILENCE_GRACE_MS = 4000;
const SILENCE_RMS_THRESHOLD = 0.008;

export interface MockCallEvent {
  state: CallState;
  message?: string;
  error?: string;
}

export interface UseMockCallOptions {
  onEvent?: (event: MockCallEvent) => void;
  onMicDisconnected?: () => void;
  onSilence?: () => void;
  onSound?: () => void;
}

export interface UseMockCallReturn {
  makeCall: () => Promise<void>;
  hangUp: () => Promise<void>;
}

interface AudioRefs {
  contextRef: RefObject<AudioContext>;
  sourceRef: RefObject<MediaStreamAudioSourceNode>;
  delayRef: RefObject<DelayNode>;
  analyserRef: RefObject<AnalyserNode>;
  unlockAudioRef: RefObject<HTMLAudioElement>;
}

const isNoDeviceError = (err: unknown): boolean => {
  const name = (err as DOMException)?.name;
  return (
    name === 'NotFoundError' ||
    name === 'NotReadableError' ||
    name === 'OverconstrainedError'
  );
};

const rms = (buf: Float32Array): number => {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 1) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
};

const teardownAudio = (refs: AudioRefs) => {
  try {
    if (refs.unlockAudioRef.current) {
      refs.unlockAudioRef.current.srcObject = null;
      refs.unlockAudioRef.current = null;
    }
    if (refs.analyserRef.current) {
      refs.analyserRef.current.disconnect();
      refs.analyserRef.current = null;
    }
    if (refs.delayRef.current) {
      refs.delayRef.current.disconnect();
      refs.delayRef.current = null;
    }
    if (refs.sourceRef.current) {
      refs.sourceRef.current.disconnect();
      refs.sourceRef.current = null;
    }
    if (refs.contextRef.current) {
      void refs.contextRef.current.close().catch(() => {});
      refs.contextRef.current = null;
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} teardownAudio:`, e);
  }
};

// Route the local mic stream back to the speakers through a short delay so the
// call sounds "live". This is the demo stand-in for a remote audio track.
const startLoopback = (stream: MediaStream, refs: AudioRefs) => {
  try {
    const ctx = ensureAudioContext(refs.contextRef, refs.sourceRef);
    createUnlockAudioElement(stream, refs.unlockAudioRef);

    const source = ctx.createMediaStreamSource(stream);
    const delay = ctx.createDelay();
    delay.delayTime.value = LOOPBACK_DELAY_SECONDS;

    source.connect(delay);
    delay.connect(ctx.destination);

    // Tap the mic level for silence detection (analyser is a dead-end node).
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 512;
    source.connect(analyser);

    refs.sourceRef.current = source;
    refs.delayRef.current = delay;
    refs.analyserRef.current = analyser;

    if (ctx.state === 'suspended') {
      void ctx.resume().catch(() => {});
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} startLoopback:`, e);
  }
};

/**
 * Drop-in replacement for the Janus SIP call hook. Instead of real telephony it
 * captures the local microphone, simulates the ring/connect lifecycle with
 * timers, and replays the mic back to the headphones once "connected".
 */
export const useMockCall = ({
  onEvent,
  onMicDisconnected,
  onSilence,
  onSound,
}: UseMockCallOptions): UseMockCallReturn => {
  const streamRef = useRef<MediaStream | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeRef = useRef(false);

  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useMemo<AudioRefs>(
    () => ({ contextRef, sourceRef, delayRef, analyserRef, unlockAudioRef }),
    [],
  );

  const monitorRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const silentMsRef = useRef(0);
  const warnedRef = useRef(false);

  const emitEvent = useCallback(
    (event: MockCallEvent) => onEvent?.(event),
    [onEvent],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
    if (monitorRef.current) {
      clearInterval(monitorRef.current);
      monitorRef.current = null;
    }
    silentMsRef.current = 0;
    warnedRef.current = false;
  }, []);

  // Watch mic input level during a connected call; warn on prolonged silence
  // (while not muted), and clear the warning once sound returns.
  const startSilenceMonitor = useCallback(() => {
    const buf = new Float32Array(analyserRef.current?.fftSize ?? 512);
    monitorRef.current = setInterval(() => {
      const analyser = analyserRef.current;
      if (
        !analyser ||
        !activeRef.current ||
        widgetState.callState !== CallState.Connected
      ) {
        return;
      }
      if (widgetState.isMicMuted) {
        silentMsRef.current = 0;
        return;
      }
      analyser.getFloatTimeDomainData(buf);
      if (rms(buf) < SILENCE_RMS_THRESHOLD) {
        silentMsRef.current += MONITOR_INTERVAL_MS;
        if (silentMsRef.current >= SILENCE_GRACE_MS && !warnedRef.current) {
          warnedRef.current = true;
          onSilence?.();
        }
      } else {
        silentMsRef.current = 0;
        if (warnedRef.current) {
          warnedRef.current = false;
          onSound?.();
        }
      }
    }, MONITOR_INTERVAL_MS);
  }, [onSilence, onSound]);

  const stopMedia = useCallback(() => {
    clearTimers();
    teardownAudio(audioRefs);
    if (micTrackRef.current) {
      micTrackRef.current.onended = null;
      micTrackRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, [audioRefs, clearTimers]);

  const hangUp = useCallback((): Promise<void> => {
    const wasActive = activeRef.current;
    activeRef.current = false;
    stopMedia();
    if (wasActive) {
      emitEvent({ state: CallState.Ended, message: 'Call terminated' });
    }
    return Promise.resolve();
  }, [emitEvent, stopMedia]);

  const makeCall = useCallback(async (): Promise<void> => {
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error(`${LOG_PREFIX} getUserMedia:`, err);
      emitEvent({
        state: CallState.Failed,
        message: isNoDeviceError(err)
          ? ERR_MIC_DISCONNECTED
          : ERR_MIC_PERMISSION,
        error: getErrorMessage(err),
      });
      return;
    }

    streamRef.current = stream;
    const micTrack = stream.getAudioTracks()[0] ?? null;
    micTrackRef.current = micTrack;
    if (micTrack) {
      micTrack.enabled = !widgetState.isMicMuted;
      micTrack.onended = () => {
        console.warn(`${LOG_PREFIX} Microphone track ended`);
        onMicDisconnected?.();
      };
    }

    activeRef.current = true;

    timersRef.current.push(
      setTimeout(() => {
        if (!activeRef.current) return;
        emitEvent({ state: CallState.Ringing, message: 'Call ringing (demo)' });
      }, RINGING_DELAY_MS),
    );

    timersRef.current.push(
      setTimeout(() => {
        if (!activeRef.current || !streamRef.current) return;
        startLoopback(streamRef.current, audioRefs);
        startSilenceMonitor();
        emitEvent({
          state: CallState.Connected,
          message: 'Call answered (demo) — replaying your microphone',
        });
      }, CONNECTED_DELAY_MS),
    );
  }, [audioRefs, emitEvent, onMicDisconnected, startSilenceMonitor]);

  // Expose hangUp to non-React callers and keep mic mute in sync with the store.
  useEffect(() => {
    hangUpRef.current = hangUp;
    const disposeMute = effect(() => {
      const muted = widgetState.isMicMuted;
      if (micTrackRef.current) micTrackRef.current.enabled = !muted;
    });
    return () => {
      disposeMute();
      if (hangUpRef.current === hangUp) hangUpRef.current = null;
      activeRef.current = false;
      stopMedia();
    };
  }, [hangUp, stopMedia]);

  return { makeCall, hangUp };
};
