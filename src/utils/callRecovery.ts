export type RecoveryState = 'healthy' | 'unstable' | 'failed';

export type RecoverySignal =
  | { type: 'ice_disconnected' }
  | { type: 'ice_failed' }
  | { type: 'ice_connected' }
  | { type: 'ws_dead' }
  | { type: 'call_answered' };

export const initialState: RecoveryState = 'healthy';

export const reduce = (
  prev: RecoveryState,
  signal: RecoverySignal,
): RecoveryState => {
  if (prev === 'failed') return 'failed';

  switch (signal.type) {
    case 'ice_disconnected':
      return prev === 'healthy' ? 'unstable' : prev;

    case 'ice_connected':
    case 'call_answered':
      return 'healthy';

    case 'ice_failed':
    case 'ws_dead':
      return 'failed';
  }
};
