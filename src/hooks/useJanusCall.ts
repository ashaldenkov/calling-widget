import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef, useEffect } from 'preact/hooks';

import {
  clearJanusHandle,
  destroyJanusSession,
  getJanusSession,
  janusHandle,
  onJanusSessionDestroyed,
  setJanusHandle,
} from '../stores/janusStore';
import { type CallFailReason, reasonFromQ850 } from '../types/callFailure';
import { CallState, type CallCustomerResponse } from '../types/types';
import { getErrorMessage } from '../utils';
import {
  createUnlockAudioElement,
  ensureAudioContext,
} from '../utils/callAudioUtils';
import {
  type RecoverySignal,
  type RecoveryState,
  initialState as initialRecoveryState,
  reduce,
} from '../utils/callRecovery';

const LOG_PREFIX = '[Janus Call]';

const getPc = (handle: unknown): RTCPeerConnection | null =>
  (handle as { webrtcStuff?: { pc?: RTCPeerConnection } } | null)?.webrtcStuff
    ?.pc ?? null;

export interface JanusCallEvent {
  state: CallState;
  message?: string; // diagnostic / fallback copy. Failed events carry `reason` for user-facing text.
  bridgeId?: string;
  error?: string;
  reason?: CallFailReason; // present whenever state === CallState.Failed
}

export interface UseJanusCallOptions {
  onEvent?: (event: JanusCallEvent) => void;
  onMicDisconnected?: () => void; // fires when track ends (notification only)
  onMicRestored?: () => void; // fires after successful replaceTrack
  onRecoveryState?: (state: RecoveryState) => void;
  janusWsUrl: string;
}

export interface UseJanusCallReturn {
  makeCall: (payload: CallCustomerResponse) => Promise<void>;
  hangUp: () => Promise<void>;
}

interface AudioContextRefs {
  contextRef: RefObject<AudioContext>;
  sourceRef: RefObject<MediaStreamAudioSourceNode>;
  unlockAudioRef: RefObject<HTMLAudioElement>;
}

const stopAudioContext = (refs: AudioContextRefs) => {
  try {
    if (refs.unlockAudioRef.current) {
      refs.unlockAudioRef.current.srcObject = null;
      refs.unlockAudioRef.current = null;
    }
    if (refs.sourceRef.current) {
      refs.sourceRef.current.disconnect();
      refs.sourceRef.current = null;
    }
    if (refs.contextRef.current) {
      refs.contextRef.current.close().catch(() => {});
      refs.contextRef.current = null;
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} stopAudioContext:`, e);
  }
};

const playStreamWithAudioContext = (
  stream: MediaStream,
  refs: AudioContextRefs,
) => {
  try {
    const ctx = ensureAudioContext(refs.contextRef, refs.sourceRef);

    createUnlockAudioElement(stream, refs.unlockAudioRef);

    const audioStream = ctx.createMediaStreamSource(stream);
    refs.sourceRef.current = audioStream;
    audioStream.connect(ctx.destination);
    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }
  } catch (e) {
    console.error(`${LOG_PREFIX} playStreamWithAudioContext:`, e);
  }
};

export const useJanusCall = ({
  onEvent,
  onMicDisconnected,
  onMicRestored,
  onRecoveryState,
  janusWsUrl,
}: UseJanusCallOptions): UseJanusCallReturn => {
  const localTrackRef = useRef<MediaStreamTrack | null>(null);
  const activeBridgeIdRef = useRef<string | undefined>(undefined);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioSourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const unlockAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRefs = useMemo<AudioContextRefs>(
    () => ({
      contextRef: audioContextRef,
      sourceRef: audioSourceRef,
      unlockAudioRef,
    }),
    [],
  );

  const clearLocalTrack = useCallback(() => {
    if (localTrackRef.current) {
      localTrackRef.current.onended = null;
      try {
        localTrackRef.current.stop();
      } catch {
        // ignore
      }
      localTrackRef.current = null;
    }
  }, []);

  const recoveryRef = useRef<RecoveryState>(initialRecoveryState);
  const localTearDownRef = useRef(false);

  useEffect(() => {
    return () => {
      if (janusHandle.value) {
        try {
          janusHandle.value.detach();
        } catch (e) {
          console.error(`${LOG_PREFIX} cleanup detach:`, e);
        }
        clearJanusHandle();
      }
      clearLocalTrack();
      stopAudioContext(audioRefs);
    };
  }, [audioRefs, clearLocalTrack]);

  const emitEvent = useCallback(
    (event: JanusCallEvent) => {
      if (onEvent) onEvent(event);
    },
    [onEvent],
  );

  const dispatchRecoveryRef = useRef<((signal: RecoverySignal) => void) | null>(
    null,
  );

  const dispatchRecovery = useCallback(
    (signal: RecoverySignal) => {
      const prev = recoveryRef.current;
      const next = reduce(prev, signal);
      if (next === prev) return;
      recoveryRef.current = next;
      onRecoveryState?.(next);
      if (next === 'failed') {
        emitEvent({
          state: CallState.Failed,
          reason: { kind: 'TechnicalError', details: 'recovery_exhausted' },
          bridgeId: activeBridgeIdRef.current,
        });
        try {
          destroyJanusSession();
        } catch {
          // ignore
        }
        clearJanusHandle();
      }
    },
    [onRecoveryState, emitEvent],
  );

  useEffect(() => {
    dispatchRecoveryRef.current = dispatchRecovery;
  }, [dispatchRecovery]);

  useEffect(() => {
    return onJanusSessionDestroyed(() => {
      if (janusHandle.value) {
        dispatchRecoveryRef.current?.({ type: 'ws_dead' });
      }
    });
  }, []);

  const tryReplaceMicTrackRef = useRef<(() => Promise<void>) | null>(null);

  const tryReplaceMicTrack = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: false,
      });
      const newTrack = stream.getAudioTracks()[0];
      if (!newTrack) throw new Error('No audio track from getUserMedia');

      const pc = getPc(janusHandle.value);
      const sender = pc?.getSenders().find((s) => s.track?.kind === 'audio');
      if (!sender) throw new Error('No audio sender');

      const wasMuted = sender.track?.enabled === false;
      const oldTrack = localTrackRef.current;

      await sender.replaceTrack(newTrack);
      if (wasMuted) newTrack.enabled = false;

      // Release the old mic
      try {
        oldTrack?.stop();
      } catch {
        // ignore
      }

      // Keep webrtcStuff.myStream in sync with Janus's muteAudio / unmuteAudio
      const myStream: MediaStream | undefined = (
        janusHandle.value?.webrtcStuff as any
      )?.myStream;
      if (myStream) {
        myStream.getAudioTracks().forEach((t) => myStream.removeTrack(t));
        myStream.addTrack(newTrack);
      }

      // Rewire onended on the replacement
      if (localTrackRef.current) localTrackRef.current.onended = null;
      localTrackRef.current = newTrack;
      newTrack.onended = () => {
        console.warn(`${LOG_PREFIX} Replacement mic track ended`);
        onMicDisconnected?.();
        void tryReplaceMicTrackRef.current?.();
      };

      onMicRestored?.();
    } catch (e) {
      // Keep the call alive
      console.error(`${LOG_PREFIX} replaceTrack failed:`, e);
    }
  }, [onMicDisconnected, onMicRestored]);

  // Keep the ref in sync so recursive onended calls see the latest closure.
  tryReplaceMicTrackRef.current = tryReplaceMicTrack;

  // Listen for mic reconnect
  useEffect(() => {
    let status: PermissionStatus | null = null;
    let cancelled = false;

    const onChange = () => {
      if (status?.state === 'granted' && janusHandle.value) {
        void tryReplaceMicTrackRef.current?.();
      }
    };

    void navigator.permissions
      ?.query({ name: 'microphone' as PermissionName })
      .then((s) => {
        if (cancelled) return;
        status = s;
        s.addEventListener('change', onChange);
      })
      .catch(() => {
        // do nothing
      });

    return () => {
      cancelled = true;
      status?.removeEventListener('change', onChange);
    };
  }, []);

  const makeCall = useCallback(
    async (payload: CallCustomerResponse) => {
      recoveryRef.current = initialRecoveryState;
      onRecoveryState?.('healthy');
      localTearDownRef.current = false;
      activeBridgeIdRef.current = payload.bridgeId;
      emitEvent({
        state: CallState.Calling,
        message: `Call started, Bridge ID: ${payload.bridgeId || 'N/A'}`,
        bridgeId: payload.bridgeId,
      });
      const targetUri = payload.targetUri;
      let janusSession: any;
      try {
        janusSession = await getJanusSession(janusWsUrl);
      } catch (error) {
        const rawMessage = getErrorMessage(error);
        console.error(`${LOG_PREFIX} getJanusSession:`, error);
        emitEvent({
          state: CallState.Failed,
          error: rawMessage,
          reason: { kind: 'TechnicalError', details: 'janus_init' },
        });
        return;
      }

      try {
        janusSession.attach({
          plugin: 'janus.plugin.sip',
          success: (pluginHandle: any) => {
            // Callbacks below reference janusHandle.value — set it before
            // Janus can invoke them.
            setJanusHandle(pluginHandle);

            const registerRequest = {
              request: 'register',
              username: 'sip:webrtc@asterisk',
              type: 'guest',
              proxy: targetUri,
            };

            janusHandle.value.send({
              message: registerRequest,
              success: () => {
                janusHandle.value.createOffer({
                  media: { audio: true, video: false },
                  success: (jsep: any) => {
                    const callRequest = {
                      request: 'call',
                      uri: targetUri,
                    };

                    janusHandle.value.send({
                      message: callRequest,
                      jsep,
                      error: (error: any) => {
                        console.error(`${LOG_PREFIX} call error:`, error);
                        emitEvent({
                          state: CallState.Failed,
                          bridgeId: payload.bridgeId,
                          error: error?.message || 'Unknown error',
                          reason: {
                            kind: 'TechnicalError',
                            details: 'janus_runtime',
                          },
                        });
                      },
                    });
                  },
                  error: (error: any) => {
                    console.error(`${LOG_PREFIX} WebRTC offer error:`, error);
                    emitEvent({
                      state: CallState.Failed,
                      bridgeId: payload.bridgeId,
                      error: error?.message || 'Unknown error',
                      reason: {
                        kind: 'TechnicalError',
                        details: 'janus_mic_failed',
                      },
                    });
                  },
                });
              },
              error: (error: any) => {
                console.error(`${LOG_PREFIX} registration error:`, error);
                emitEvent({
                  state: CallState.Failed,
                  bridgeId: payload.bridgeId,
                  error: error?.message || 'Unknown error',
                  reason: { kind: 'TechnicalError', details: 'janus_register' },
                });
              },
            });
          },
          error: (error: any) => {
            console.error(`${LOG_PREFIX} SIP plugin attach error:`, error);
            emitEvent({
              state: CallState.Failed,
              bridgeId: payload.bridgeId,
              error: error?.message || 'Unknown error',
              reason: { kind: 'TechnicalError', details: 'janus_init' },
            });
          },
          onmessage: (msg: any, jsep: any) => {
            const event = msg?.result?.event;

            // NOTE: Handle other events if needed
            // registered, calling, incomingcall
            if (event === 'progress') {
              if (jsep) {
                janusHandle.value.handleRemoteJsep({ jsep: jsep });
              }
            } else if (event === 'ringing') {
              emitEvent({
                state: CallState.Ringing,
                message: `Call ringing, Bridge ID: ${payload.bridgeId || 'N/A'}`,
                bridgeId: payload.bridgeId,
              });
            } else if (event === 'accepted') {
              if (jsep) {
                janusHandle.value.handleRemoteJsep({ jsep: jsep });
              }

              const micTrack =
                janusHandle.value?.webrtcStuff?.myStream?.getAudioTracks()[0];
              if (micTrack) {
                localTrackRef.current = micTrack;
                micTrack.onended = () => {
                  console.warn(`${LOG_PREFIX} Microphone track ended`);
                  onMicDisconnected?.();
                  void tryReplaceMicTrack();
                };
              }

              emitEvent({
                state: CallState.Connected,
                message: `Call answered, Bridge ID: ${payload.bridgeId || 'N/A'}`,
                bridgeId: payload.bridgeId,
              });
              dispatchRecoveryRef.current?.({ type: 'call_answered' });
            } else if (event === 'hangup') {
              stopAudioContext(audioRefs);
              const cause: unknown = msg?.result?.code;
              const failReason = reasonFromQ850(cause);
              if (failReason) {
                emitEvent({
                  state: CallState.Failed,
                  bridgeId: payload.bridgeId,
                  reason: failReason,
                  error: msg?.result?.reason ?? `Q.850 ${String(cause)}`,
                });
              } else {
                emitEvent({
                  state: CallState.Ended,
                  message: 'Call terminated',
                  bridgeId: payload.bridgeId,
                });
              }
            }
          },
          onremotetrack: (
            track: MediaStreamTrack,
            _mid: string,
            on: boolean,
          ) => {
            if (on && track.kind === 'audio') {
              const stream = new MediaStream([track]);
              playStreamWithAudioContext(stream, audioRefs);
            } else if (!on) {
              stopAudioContext(audioRefs);
            }
          },
          webrtcState: (on: boolean) => {
            if (!on) {
              stopAudioContext(audioRefs);
            }
          },
          iceState: (state: string) => {
            if (state === 'disconnected') {
              dispatchRecoveryRef.current?.({ type: 'ice_disconnected' });
            } else if (state === 'failed' || state === 'closed') {
              dispatchRecoveryRef.current?.({ type: 'ice_failed' });
            } else if (state === 'connected' || state === 'completed') {
              dispatchRecoveryRef.current?.({ type: 'ice_connected' });
            }
          },
          connectionState: (state: string) => {
            if (state === 'failed') {
              dispatchRecoveryRef.current?.({ type: 'ice_failed' });
            }
          },
          oncleanup: () => {
            if (localTearDownRef.current) return;
            dispatchRecoveryRef.current?.({ type: 'ws_dead' });
          },
          detached: () => {
            if (localTearDownRef.current) return;
            dispatchRecoveryRef.current?.({ type: 'ws_dead' });
          },
        });
      } catch (error) {
        const rawMessage = getErrorMessage(error);
        console.error(`${LOG_PREFIX} Janus connection error:`, error);
        emitEvent({
          state: CallState.Failed,
          bridgeId: payload.bridgeId,
          error: rawMessage,
          reason: { kind: 'TechnicalError', details: 'janus_init' },
        });
      }
    },
    [
      emitEvent,
      audioRefs,
      janusWsUrl,
      onMicDisconnected,
      onRecoveryState,
      tryReplaceMicTrack,
    ],
  );

  const hangUp = useCallback(async () => {
    localTearDownRef.current = true;
    recoveryRef.current = initialRecoveryState;
    onRecoveryState?.('healthy');
    clearLocalTrack();
    // Treat an in-flight setup (bridgeId set but janusHandle not yet attached)
    // as active, so the synthetic Ended event below fires and the UI returns
    // to idle instead of getting stuck on the Calling screen.
    const bridgeId = activeBridgeIdRef.current;
    const wasActive = !!janusHandle.value || bridgeId !== undefined;
    activeBridgeIdRef.current = undefined;
    if (janusHandle.value) {
      try {
        janusHandle.value.send({ message: { request: 'hangup' } });
      } catch (error) {
        console.error(`${LOG_PREFIX} SIP hangup send failed:`, error);
      }
      try {
        janusHandle.value.hangup();
      } catch (error) {
        console.error(`${LOG_PREFIX} PC hangup failed:`, error);
      }
      try {
        janusHandle.value.detach();
      } catch (error) {
        console.error(`${LOG_PREFIX} detach failed:`, error);
      }
      clearJanusHandle();
    }
    stopAudioContext(audioRefs);
    if (wasActive) {
      // Janus does not redeliver 'hangup' after a local detach, so the
      // consumer relies on this synthetic Ended to advance the UI.
      emitEvent({
        state: CallState.Ended,
        message: 'Call terminated',
        bridgeId,
      });
    }
  }, [audioRefs, clearLocalTrack, emitEvent, onRecoveryState]);

  return {
    makeCall,
    hangUp,
  };
};
