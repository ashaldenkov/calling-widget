import { reduce, RecoveryState, initialState } from './callRecovery';

describe('callRecovery reduce', () => {
  it('initialState is Healthy', () => {
    expect(initialState).toBe(RecoveryState.Healthy);
  });

  describe('from Healthy', () => {
    it('ice_disconnected → Unstable (first sign of trouble)', () => {
      expect(reduce(RecoveryState.Healthy, { type: 'ice_disconnected' })).toBe(
        RecoveryState.Unstable,
      );
    });

    it('ice_connected → Healthy (already fine, stays fine)', () => {
      expect(reduce(RecoveryState.Healthy, { type: 'ice_connected' })).toBe(
        RecoveryState.Healthy,
      );
    });

    it('call_answered → Healthy (call established, reset any prior transient issues)', () => {
      expect(reduce(RecoveryState.Healthy, { type: 'call_answered' })).toBe(
        RecoveryState.Healthy,
      );
    });

    it('ice_failed → Failed (unrecoverable ICE failure)', () => {
      expect(reduce(RecoveryState.Healthy, { type: 'ice_failed' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('ws_dead → Failed (WebSocket lost, cannot restore session)', () => {
      expect(reduce(RecoveryState.Healthy, { type: 'ws_dead' })).toBe(
        RecoveryState.Failed,
      );
    });
  });

  describe('from Unstable', () => {
    it('ice_disconnected → stays Unstable (already degraded, does not worsen on repeated disconnects)', () => {
      expect(reduce(RecoveryState.Unstable, { type: 'ice_disconnected' })).toBe(
        RecoveryState.Unstable,
      );
    });

    it('ice_connected → Healthy (reconnected successfully)', () => {
      expect(reduce(RecoveryState.Unstable, { type: 'ice_connected' })).toBe(
        RecoveryState.Healthy,
      );
    });

    it('call_answered → Healthy (new answer resets the recovery state)', () => {
      expect(reduce(RecoveryState.Unstable, { type: 'call_answered' })).toBe(
        RecoveryState.Healthy,
      );
    });

    it('ice_failed → Failed (ICE fully broken while unstable)', () => {
      expect(reduce(RecoveryState.Unstable, { type: 'ice_failed' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('ws_dead → Failed (WebSocket lost while unstable)', () => {
      expect(reduce(RecoveryState.Unstable, { type: 'ws_dead' })).toBe(
        RecoveryState.Failed,
      );
    });
  });

  describe('from Failed — terminal state, no recovery possible', () => {
    it('ice_disconnected → remains Failed', () => {
      expect(reduce(RecoveryState.Failed, { type: 'ice_disconnected' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('ice_connected → remains Failed (too late to recover)', () => {
      expect(reduce(RecoveryState.Failed, { type: 'ice_connected' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('call_answered → remains Failed', () => {
      expect(reduce(RecoveryState.Failed, { type: 'call_answered' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('ice_failed → remains Failed', () => {
      expect(reduce(RecoveryState.Failed, { type: 'ice_failed' })).toBe(
        RecoveryState.Failed,
      );
    });

    it('ws_dead → remains Failed', () => {
      expect(reduce(RecoveryState.Failed, { type: 'ws_dead' })).toBe(
        RecoveryState.Failed,
      );
    });
  });

  describe('chained signals — stateless reducer composes correctly', () => {
    it('Healthy → disconnect → disconnect → reconnect → Healthy', () => {
      let state = RecoveryState.Healthy;
      state = reduce(state, { type: 'ice_disconnected' }); // Unstable
      state = reduce(state, { type: 'ice_disconnected' }); // Unstable (no change)
      state = reduce(state, { type: 'ice_connected' }); // Healthy
      expect(state).toBe(RecoveryState.Healthy);
    });

    it('Healthy → disconnect → ws_dead → connected does not recover from Failed', () => {
      let state = RecoveryState.Healthy;
      state = reduce(state, { type: 'ice_disconnected' }); // Unstable
      state = reduce(state, { type: 'ws_dead' }); // Failed
      state = reduce(state, { type: 'ice_connected' }); // still Failed
      expect(state).toBe(RecoveryState.Failed);
    });
  });
});
