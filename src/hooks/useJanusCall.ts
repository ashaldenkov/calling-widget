import type { RefObject } from 'preact';
import { useCallback, useMemo, useRef, useEffect } from 'preact/hooks';

import {
  ERR_CALL_FAILED,
  ERR_JANUS_CONNECTION,
  ERR_JANUS_NOT_LOADED,
} from '../errors';
import { getJanusSession } from '../stores/janusStore';
import { CallState, type CallCustomerResponse } from '../types/types';
import { getErrorMessage } from '../utils';
import {
  createUnlockAudioElement,
  ensureAudioContext,
} from '../utils/callAudioUtils';

const LOG_PREFIX = '[Janus Call]';

export interface JanusCallEvent {
  state: CallState;
  message: string;
  bridgeId?: string;
  error?: string;
}

export interface UseJanusCallOptions {
  onEvent?: (event: JanusCallEvent) => void;
  onMicDisconnected?: () => void;
  janusWsUrl: string;
}

export interface UseJanusCallReturn {
  makeCall: (payload: CallCustomerResponse) => Promise<void>;
  hangUp: () => Promise<void>;
  setMute: (muted: boolean) => void;
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
  janusWsUrl,
}: UseJanusCallOptions): UseJanusCallReturn => {
  const handleRef = useRef<any>(null);
  const localTrackRef = useRef<MediaStreamTrack | null>(null);
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
      localTrackRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      if (handleRef.current) {
        try {
          handleRef.current.detach();
        } catch (e) {
          console.error(`${LOG_PREFIX} cleanup detach:`, e);
        }
        handleRef.current = null;
      }
      clearLocalTrack();
      stopAudioContext(audioRefs);
    };
  }, [audioRefs, clearLocalTrack]);

  const emitEvent = useCallback(
    (event: JanusCallEvent) => {
      if (onEvent) {
        onEvent(event);
      }
    },
    [onEvent],
  );

  const makeCall = useCallback(
    async (payload: CallCustomerResponse) => {
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
          message:
            rawMessage === 'Janus library not available'
              ? ERR_JANUS_NOT_LOADED
              : ERR_JANUS_CONNECTION,
          error: rawMessage,
        });
        return;
      }

      try {
        janusSession.attach({
          plugin: 'janus.plugin.sip',
          success: (pluginHandle: any) => {
            // set before async callbacks — success, onmessage etc.
            // close over handleRef.current and rely on it being set by the time they fire
            handleRef.current = pluginHandle;

            const registerRequest = {
              request: 'register',
              username: 'sip:webrtc@asterisk',
              type: 'guest',
              proxy: targetUri,
            };

            handleRef.current.send({
              message: registerRequest,
              success: () => {
                handleRef.current.createOffer({
                  media: { audio: true, video: false },
                  success: (jsep: any) => {
                    const callRequest = {
                      request: 'call',
                      uri: targetUri,
                    };

                    handleRef.current.send({
                      message: callRequest,
                      jsep,
                      error: (error: any) => {
                        console.error(`${LOG_PREFIX} call error:`, error);
                        emitEvent({
                          state: CallState.Failed,
                          message: ERR_CALL_FAILED,
                          error: error?.message || 'Unknown error',
                        });
                      },
                    });
                  },
                  error: (error: any) => {
                    console.error(`${LOG_PREFIX} WebRTC offer error:`, error);
                    emitEvent({
                      state: CallState.Failed,
                      message: ERR_JANUS_CONNECTION,
                      error: error?.message || 'Unknown error',
                    });
                  },
                });
              },
              error: (error: any) => {
                console.error(`${LOG_PREFIX} registration error:`, error);
                emitEvent({
                  state: CallState.Failed,
                  message: ERR_JANUS_CONNECTION,
                  error: error?.message || 'Unknown error',
                });
              },
            });

            handleRef.current.onmessage = (msg: any, jsep: any) => {
              const event = msg?.result?.event;

              // NOTE: Handle other events if needed
              // registered, calling, incomingcall
              if (event === 'progress') {
                if (jsep) {
                  handleRef.current.handleRemoteJsep({ jsep: jsep });
                }
              } else if (event === 'ringing') {
                emitEvent({
                  state: CallState.Ringing,
                  message: `Call ringing, Bridge ID: ${payload.bridgeId || 'N/A'}`,
                  bridgeId: payload.bridgeId,
                });
              } else if (event === 'accepted') {
                if (jsep) {
                  handleRef.current.handleRemoteJsep({ jsep: jsep });
                }

                const micTrack =
                  handleRef.current?.webrtcStuff?.myStream?.getAudioTracks()[0];
                if (micTrack) {
                  localTrackRef.current = micTrack;
                  micTrack.onended = () => {
                    console.warn(`${LOG_PREFIX} Microphone track ended`);
                    onMicDisconnected?.();
                  };
                }

                emitEvent({
                  state: CallState.Connected,
                  message: `Call answered, Bridge ID: ${payload.bridgeId || 'N/A'}`,
                  bridgeId: payload.bridgeId,
                });
              } else if (event === 'hangup') {
                stopAudioContext(audioRefs);
                emitEvent({
                  state: CallState.Ended,
                  message: 'Call terminated',
                });
              }
            };

            handleRef.current.onremotetrack = (
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
            };

            handleRef.current.webrtcState = (on: boolean) => {
              if (!on) {
                stopAudioContext(audioRefs);
              }
            };

            handleRef.current.iceState = () => {};
            handleRef.current.mediaState = () => {};
            handleRef.current.slowLink = () => {};
            handleRef.current.oncleanup = () => {};
            handleRef.current.detached = () => {};
          },
          error: (error: any) => {
            console.error(`${LOG_PREFIX} SIP plugin attach error:`, error);
            emitEvent({
              state: CallState.Failed,
              message: ERR_JANUS_CONNECTION,
              error: error?.message || 'Unknown error',
            });
          },
        });
      } catch (error) {
        const rawMessage = getErrorMessage(error);
        console.error(`${LOG_PREFIX} Janus connection error:`, error);
        emitEvent({
          state: CallState.Failed,
          message: ERR_JANUS_CONNECTION,
          error: rawMessage,
        });
      }
    },
    [emitEvent, audioRefs, janusWsUrl, onMicDisconnected],
  );

  const hangUp = useCallback(async () => {
    clearLocalTrack();
    const wasActive = !!handleRef.current;
    if (handleRef.current) {
      try {
        handleRef.current.hangup();
        handleRef.current.detach();
      } catch (error) {
        console.error(`${LOG_PREFIX} Error hanging up:`, error);
      }
      handleRef.current = null;
    }
    stopAudioContext(audioRefs);
    if (wasActive) {
      emitEvent({ state: CallState.Ended, message: 'Call terminated' });
    }
  }, [audioRefs, clearLocalTrack, emitEvent]);

  const setMute = useCallback((muted: boolean) => {
    const handle = handleRef.current;
    if (!handle?.webrtcStuff?.myStream) return;
    try {
      if (muted) {
        handle?.muteAudio();
      } else {
        handle?.unmuteAudio();
      }
    } catch (error) {
      console.error(`${LOG_PREFIX} Error setting mute:`, error);
    }
  }, []);

  return {
    makeCall,
    hangUp,
    setMute,
  };
};
