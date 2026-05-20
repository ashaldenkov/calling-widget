export enum RecoveryState {
  Healthy = 'healthy',
  Unstable = 'unstable',
  Failed = 'failed',
}

export type RecoverySignal =
  | { type: 'ice_disconnected' }
  | { type: 'ice_failed' }
  | { type: 'ice_connected' }
  | { type: 'ws_dead' }
  | { type: 'call_answered' };

export const initialState: RecoveryState = RecoveryState.Healthy;

export const reduce = (
  prev: RecoveryState,
  signal: RecoverySignal,
): RecoveryState => {
  if (prev === RecoveryState.Failed) return RecoveryState.Failed;

  switch (signal.type) {
    case 'ice_disconnected':
      return prev === RecoveryState.Healthy ? RecoveryState.Unstable : prev;

    case 'ice_connected':
    case 'call_answered':
      return RecoveryState.Healthy;

    case 'ice_failed':
    case 'ws_dead':
      return RecoveryState.Failed;
  }
};
