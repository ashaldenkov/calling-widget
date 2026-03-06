import { Collapse, Paper } from '@mui/material';
import { useCallback, useEffect, useRef, useState } from 'react';

import { eventBus, WidgetEvent } from '../eventBus';
import { useCall } from '../hooks/useCall';
import {
  CallInformationScreen,
  CollapsedCallBar,
  ConfirmationScreen,
  ErrorScreen,
} from '../screens';
import { useWidgetStore } from '../stores/widgetStore';
import { colors, elevatedPaperShadow } from '../theme';
import { CallState } from '../types/types';

export const ExternalCallWidget = () => {
  const screen = useWidgetStore((s) => s.screen);
  const callState = useWidgetStore((s) => s.callState);
  const customerData = useWidgetStore((s) => s.customerData);
  const isMicMuted = useWidgetStore((s) => s.isMicMuted);
  const error = useWidgetStore((s) => s.error);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isCollapsed, setIsCollapsed] = useState(true);

  const isConnected = callState === CallState.Connected;

  const { hangUp, setMute, startCall, isLoading } = useCall(audioRef);

  useEffect(() => {
    setMute(isMicMuted);
    eventBus.emit(WidgetEvent.MicToggled, { muted: isMicMuted });
  }, [isMicMuted, setMute]);

  const handleClose = useCallback(() => {
    void hangUp();
    useWidgetStore.getState().resetToIdle();
    setIsCollapsed(true);
    eventBus.emit(WidgetEvent.WidgetDismissed);
  }, [hangUp]);

  useEffect(() => {
    if (callState === CallState.Ended) {
      handleClose();
    }
  }, [callState, handleClose]);

  const handleConfirm = useCallback(async () => {
    setIsCollapsed(true);
    await startCall();
  }, [startCall]);

  if (screen === 'idle') return null;

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 24,
        right: 24,
        width: 500,
        overflow: 'hidden',
        pointerEvents: 'auto',
        ...elevatedPaperShadow,
        outline:
          isConnected && screen === 'calling'
            ? `1px solid ${colors.success}`
            : 'none',
      }}
    >
      <audio ref={audioRef} autoPlay style={{ display: 'none' }} />

      {screen === 'confirmation' && (
        <ConfirmationScreen
          onCancel={handleClose}
          onConfirm={() => void handleConfirm()}
          loading={isLoading}
        />
      )}

      {screen === 'error' && (
        <ErrorScreen onClose={handleClose} message={error ?? undefined} />
      )}

      {screen === 'calling' && customerData && (
        <>
          <Collapse in={!isCollapsed} timeout={300} unmountOnExit>
            <CallInformationScreen
              customer={customerData}
              onCollapse={() => setIsCollapsed(true)}
              onEndCall={handleClose}
            />
          </Collapse>
          <Collapse in={isCollapsed} timeout={300} unmountOnExit>
            <CollapsedCallBar
              customer={customerData}
              onExpand={() => setIsCollapsed(false)}
              onEndCall={handleClose}
            />
          </Collapse>
        </>
      )}
    </Paper>
  );
};
