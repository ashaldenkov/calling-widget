import createCache from '@emotion/cache';
import { CacheProvider } from '@emotion/react';
import { createTheme, ThemeProvider } from '@mui/material';
import { QueryClientProvider } from '@tanstack/react-query';
import { useMemo } from 'react';

import { queryClient } from './api/queryClient';
import { ExternalCallWidget } from './components/ExternalCallWidget';
import { WidgetErrorBoundary } from './components/WidgetErrorBoundary';
import { createMuiTheme } from './theme';

interface AppProps {
  shadowRoot: ShadowRoot;
}

export const App = ({ shadowRoot }: AppProps) => {
  const emotionCache = useMemo(
    () =>
      createCache({
        key: 'widget',
        prepend: true,
        container: shadowRoot,
      }),
    [shadowRoot],
  );

  const theme = useMemo(
    () =>
      createTheme(createMuiTheme('light'), {
        components: {
          MuiPopover: { defaultProps: { container: shadowRoot } },
          MuiPopper: { defaultProps: { container: shadowRoot } },
          MuiModal: { defaultProps: { container: shadowRoot } },
        },
      }),
    [shadowRoot],
  );

  return (
    <QueryClientProvider client={queryClient}>
      <CacheProvider value={emotionCache}>
        <ThemeProvider theme={theme}>
          <WidgetErrorBoundary>
            <ExternalCallWidget />
          </WidgetErrorBoundary>
        </ThemeProvider>
      </CacheProvider>
    </QueryClientProvider>
  );
};
