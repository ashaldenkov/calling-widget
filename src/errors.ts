import { TechnicalError, type CallFailReason } from './types/callFailure';

export const ERR_RENDER =
  'A rendering error occurred. Please close and reopen the widget.';

export const ERR_MIC_PERMISSION =
  'Microphone permission denied. Please allow access in your browser settings.';
export const ERR_MIC_DISCONNECTED =
  'No microphone detected. Please connect your device.';

export const ERR_CUSTOMER_IN_CALL = 'This customer is already on a call.';
export const ERR_CALL_IN_OTHER_TAB =
  'A call is already running in another browser tab. End it there to make a new call here.';

export const ERR_SESSION_EXPIRED = 'Session expired. Please refresh the page.';
export const ERR_GENERIC = 'Something went wrong.';

// SIP / Trunk
export const ERR_NO_TRUNKS = 'No SIP trunk is available for this client.';
export const ERR_CUSTOMER_DATA = 'Customer data not available.';

export const NOTIF_RECONNECTING =
  "Connection lost. We're trying to reconnect you now.";

export const getErrorMessage = (
  error: unknown,
  fallback = ERR_GENERIC,
): string => (error instanceof Error ? error.message : fallback);

export const getFailureMessage = (reason: CallFailReason): string => {
  switch (reason.kind) {
    case 'Busy':
      return 'Line busy.';
    case 'NoAnswer':
      return 'No answer.';
    case 'ProviderError':
      return `Provider error (${reason.cause}). Please try again.`;
    case 'TechnicalError':
      return TechnicalError[reason.details];
  }
};

export function mapHttpError(status: number, serverMessage?: string): string {
  if (
    serverMessage &&
    serverMessage.length < 200 &&
    !serverMessage.includes('\n')
  ) {
    return serverMessage;
  }
  if (status === 401) return ERR_SESSION_EXPIRED;
  if (status === 403) return 'You do not have permission to call this client.';
  return ERR_GENERIC;
}
