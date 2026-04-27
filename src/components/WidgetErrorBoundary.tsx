import { Paper } from '@mui/material';
import { type ReactNode } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';

import { ERR_RENDER } from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import ErrorScreen from '../screens/ErrorScreen';
import { resetToIdle } from '../stores/widgetStore';
import { elevatedPaperShadow } from '../theme';
import { getErrorMessage } from '../utils';

const ErrorFallback = ({ resetErrorBoundary }: FallbackProps) => {
  const handleClose = () => {
    resetToIdle();
    eventBus.emit(WidgetEvent.WidgetDismissed);
    resetErrorBoundary();
  };

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
      }}
    >
      <ErrorScreen onClose={handleClose} />
    </Paper>
  );
};

const handleError = (
  error: unknown,
  info: { componentStack?: string | null },
) => {
  console.error('[CallWidget] Render error:', error, info);
  const message = getErrorMessage(error, ERR_RENDER);
  eventBus.emit(WidgetEvent.Error, { message });
};

export const WidgetErrorBoundary = ({ children }: { children: ReactNode }) => (
  <ErrorBoundary FallbackComponent={ErrorFallback} onError={handleError}>
    {children}
  </ErrorBoundary>
);
