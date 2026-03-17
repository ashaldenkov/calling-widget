import type { RefObject } from 'react';

/**
 * Returns a new AudioContext, using webkitAudioContext on Safari when needed.
 */
export const getAudioContext = (): AudioContext => {
  const Ctx =
    window.AudioContext ||
    (window as unknown as { webkitAudioContext: typeof AudioContext })
      .webkitAudioContext;
  return new Ctx();
};

/**
 * Ensures a valid AudioContext: clears closed context and existing source refs,
 * creates a new context if none exists, and returns it.
 */
export const ensureAudioContext = (
  contextRef: RefObject<AudioContext | null>,
  sourceRef: RefObject<MediaStreamAudioSourceNode | null>,
): AudioContext => {
  let ctx = contextRef.current;
  if (ctx?.state === 'closed') {
    contextRef.current = null;
    ctx = null;
  }
  if (sourceRef.current) {
    sourceRef.current.disconnect();
    sourceRef.current = null;
  }
  if (!ctx) {
    ctx = getAudioContext();
    contextRef.current = ctx;
  }
  return ctx;
};

/**
 * Chrome workaround: attach stream to a muted audio element and play so the stream
 * is "unlocked"; actual playback is done via AudioContext elsewhere.
 */
export const createUnlockAudioElement = (
  stream: MediaStream,
  unlockAudioRef: RefObject<HTMLAudioElement | null>,
): void => {
  if (unlockAudioRef.current) {
    unlockAudioRef.current.srcObject = null;
    unlockAudioRef.current = null;
  }
  const unlockAudio = new Audio();
  unlockAudio.muted = true;
  unlockAudio.srcObject = stream;
  unlockAudioRef.current = unlockAudio;
  unlockAudio.play().catch(() => {});
};
