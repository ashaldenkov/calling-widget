import { effect } from '@preact/signals';
import type { RefObject } from 'preact';
import { useCallback, useEffect, useMemo, useRef } from 'preact/hooks';

import { ERR_MIC_PERMISSION, getErrorMessage } from '../errors';
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

export interface MockCallEvent {
  state: CallState;
  message?: string;
  error?: string;
}

export interface UseMockCallOptions {
  onEvent?: (event: MockCallEvent) => void;
  onMicDisconnected?: () => void;
}

export interface UseMockCallReturn {
  makeCall: () => Promise<void>;
  hangUp: () => Promise<void>;
}

interface AudioRefs {
  contextRef: RefObject<AudioContext>;
  sourceRef: RefObject<MediaStreamAudioSourceNode>;
  delayRef: RefObject<DelayNode>;
  unlockAudioRef: RefObject<HTMLAudioElement>;
}

const teardownAudio = (refs: AudioRefs) => {
  try {
    if (refs.unlockAudioRef.current) {
      refs.unlockAudioRef.current.srcObject = null;
      refs.unlockAudioRef.current = null;
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

    refs.sourceRef.current = source;
    refs.delayRef.current = delay;

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
}: UseMockCallOptions): UseMockCallReturn => {
  const streamRef = useRef<MediaStream | null>(null);
  const micTrackRef = useRef<MediaStreamTrack | null>(null);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const activeRef = useRef(false);

  const contextRef = useRef<AudioContext | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const delayRef = useRef<DelayNode | null>(null);
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useMemo<AudioRefs>(
    () => ({ contextRef, sourceRef, delayRef, unlockAudioRef }),
    [],
  );

  const emitEvent = useCallback(
    (event: MockCallEvent) => onEvent?.(event),
    [onEvent],
  );

  const clearTimers = useCallback(() => {
    timersRef.current.forEach((t) => clearTimeout(t));
    timersRef.current = [];
  }, []);

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
        message: ERR_MIC_PERMISSION,
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
        emitEvent({
          state: CallState.Connected,
          message: 'Call answered (demo) — replaying your microphone',
        });
      }, CONNECTED_DELAY_MS),
    );
  }, [audioRefs, emitEvent, onMicDisconnected]);

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
