// Mic / audio
export const ERR_MIC_PERMISSION =
  'Microphone permission denied. Please allow access in your browser settings.';
export const ERR_MIC_DISCONNECTED =
  'No microphone detected. Please connect your device.';

// Network / API
export const ERR_SESSION_EXPIRED = 'Session expired. Please refresh the page.';
export const ERR_SERVER = 'Server error. Please try again.';
export const ERR_GENERIC = 'Something went wrong.';

// SIP / Trunk
export const ERR_NO_TRUNKS = 'No SIP trunk is available for this client.';
export const ERR_TRUNK_FETCH = 'Failed to load SIP trunk. Please try again.';
export const ERR_CALL_START = 'Failed to start the call. Please try again.';
export const ERR_CUSTOMER_DATA = 'Customer data not available.';

// Janus / WebRTC
export const ERR_JANUS_NOT_LOADED =
  'Call setup failed. Please refresh the page.';
export const ERR_JANUS_CONNECTION = 'Connection lost. Please try again.';
export const ERR_CALL_FAILED = 'Call failed. Please try again.';

export const ERR_CUSTOMER_IN_CALL = 'This customer is already on a call.';
export const ERR_CALL_IN_OTHER_TAB =
  'A call is already running in another browser tab. End it there to make a new call here.';

// Status
export const ERR_STATUS_SAVE = 'Failed to save status. Please try again.';

// Render (error boundary)
export const ERR_RENDER =
  'A rendering error occurred. Please close and reopen the widget.';

// Maps an HTTP error response to a message.

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
  if (status >= 500) return ERR_SERVER;
  return ERR_GENERIC;
}
