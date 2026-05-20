export const TechnicalError = {
  janus_mic_failed: 'Microphone unavailable. Please check your mic.',
  janus_init: 'Calling service unavailable. Please try again.',
  janus_register: 'Could not register with the calling service.',
  janus_runtime: 'Connection to the calling service was lost.',
  recovery_exhausted:
    'Unable to restore the call. Please try calling the client again.',
} as const;

export type TechnicalErrorDetail = keyof typeof TechnicalError;

export type CallFailReason =
  | { kind: 'Busy' }
  | { kind: 'NoAnswer' }
  | { kind: 'ProviderError'; cause: number }
  | { kind: 'TechnicalError'; details: TechnicalErrorDetail };

const Q850_NORMAL = 16;
const Q850_BUSY = 17;
const Q850_NO_ANSWER_CODES: ReadonlySet<number> = new Set([18, 19, 20]);
const Q850_MAX = 127;

export const reasonFromQ850 = (cause: unknown): CallFailReason | null => {
  const n = Number.parseInt(String(cause), 10);
  if (!Number.isFinite(n) || n <= 0 || n === Q850_NORMAL || n > Q850_MAX) {
    return null;
  }
  if (n === Q850_BUSY) return { kind: 'Busy' };
  if (Q850_NO_ANSWER_CODES.has(n)) return { kind: 'NoAnswer' };
  return { kind: 'ProviderError', cause: n };
};
