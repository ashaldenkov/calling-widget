import React, { useCallback, useRef, useEffect } from 'react';

import { getJanusSession } from '../stores/janusStore';
import { CallState, type CallCustomerResponse } from '../types/types';
import { getErrorMessage } from '../utils';

const LOG_PREFIX = '[Janus Call]';

export interface JanusCallEvent {
  state: CallState;
  message: string;
  bridgeId?: string;
  error?: string;
}

export interface UseJanusCallOptions {
  onEvent?: (event: JanusCallEvent) => void;
  audioElementRef?: React.RefObject<HTMLAudioElement | null>;
  janusWsUrl: string;
}

export interface UseJanusCallReturn {
  makeCall: (payload: CallCustomerResponse) => Promise<void>;
  hangUp: () => Promise<void>;
  setMute: (muted: boolean) => void;
}

export const useJanusCall = ({
  onEvent,
  audioElementRef,
  janusWsUrl,
}: UseJanusCallOptions): UseJanusCallReturn => {
  const handleRef = useRef<any>(null);
  const internalAudioRef = useRef<HTMLAudioElement | null>(null);
  const audioRef = audioElementRef ?? internalAudioRef;

  useEffect(() => {
    const audioElement = audioRef.current;
    return () => {
      if (handleRef.current) {
        try {
          handleRef.current.detach();
        } catch (error) {
          console.error(`${LOG_PREFIX} Error detaching handle:`, error);
        }
        handleRef.current = null;
      }
      if (audioElement) {
        audioElement.srcObject = null;
      }
    };
  }, [audioRef]);

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
        const message = getErrorMessage(error);
        emitEvent({
          state: CallState.Failed,
          message:
            message === 'Janus library not available'
              ? message
              : `Janus error: ${message}`,
          error: message,
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
                        emitEvent({
                          state: CallState.Failed,
                          message: `Janus call error: ${error?.message || 'Unknown error'}`,
                          error: error?.message || 'Unknown error',
                        });
                      },
                    });
                  },
                  error: (error: any) => {
                    emitEvent({
                      state: CallState.Failed,
                      message: `Failed to create WebRTC offer: ${error?.message || 'Unknown error'}`,
                      error: error?.message || 'Unknown error',
                    });
                  },
                });
              },
              error: (error: any) => {
                emitEvent({
                  state: CallState.Failed,
                  message: `Janus registration error: ${error?.message || 'Unknown error'}`,
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

                emitEvent({
                  state: CallState.Connected,
                  message: `Call answered, Bridge ID: ${payload.bridgeId || 'N/A'}`,
                  bridgeId: payload.bridgeId,
                });
              } else if (event === 'hangup') {
                if (audioRef.current) {
                  audioRef.current.srcObject = null;
                }

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
              if (on && track.kind === 'audio' && audioRef.current) {
                const stream = new MediaStream([track]);
                audioRef.current.srcObject = stream;
                audioRef.current.play().catch((error) => {
                  console.error(`${LOG_PREFIX} Error playing audio:`, error);
                });
              } else if (!on && audioRef.current) {
                audioRef.current.srcObject = null;
              }
            };

            handleRef.current.webrtcState = (on: boolean) => {
              if (!on && audioRef.current) {
                audioRef.current.srcObject = null;
              }
            };

            handleRef.current.iceState = () => {};
            handleRef.current.mediaState = () => {};
            handleRef.current.slowLink = () => {};
            handleRef.current.oncleanup = () => {};
            handleRef.current.detached = () => {};
          },
          error: (error: any) => {
            emitEvent({
              state: CallState.Failed,
              message: `Failed to attach to Janus SIP plugin: ${error?.message || 'Unknown error'}`,
              error: error?.message || 'Unknown error',
            });
          },
        });
      } catch (error) {
        console.error(`${LOG_PREFIX} Janus connection error:`, error);
        emitEvent({
          state: CallState.Failed,
          message: `Janus connection error: ${getErrorMessage(error)}`,
          error: getErrorMessage(error),
        });
      }
    },
    [emitEvent, audioRef, janusWsUrl],
  );

  const hangUp = useCallback(async () => {
    if (handleRef.current) {
      try {
        handleRef.current.hangup();
        handleRef.current.detach();
      } catch (error) {
        console.error(`${LOG_PREFIX} Error hanging up:`, error);
      }
      handleRef.current = null;
    }

    if (audioRef.current) {
      audioRef.current.srcObject = null;
    }

    emitEvent({ state: CallState.Ended, message: 'Call terminated' });
  }, [audioRef, emitEvent]);

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
