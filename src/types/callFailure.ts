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

const SIP_BUSY_CODES: ReadonlySet<number> = new Set([486, 600]); // Busy Here, Busy Everywhere
const SIP_NO_ANSWER_CODES: ReadonlySet<number> = new Set([408, 480, 487]); // Request Timeout, Temporarily Unavailable, Request Terminated

// Fallback classifier for hangups that carry no Q.850 Reason header — maps the
// raw SIP status code. Only 4xx+ are failures; 1xx/2xx/3xx are not.
export const reasonFromSipCode = (code: unknown): CallFailReason | null => {
  const n = Number.parseInt(String(code), 10);
  if (!Number.isFinite(n) || n < 400) return null;
  if (SIP_BUSY_CODES.has(n)) return { kind: 'Busy' };
  if (SIP_NO_ANSWER_CODES.has(n)) return { kind: 'NoAnswer' };
  return { kind: 'ProviderError', cause: n };
};
