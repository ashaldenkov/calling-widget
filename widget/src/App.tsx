import { QueryClientProvider } from '@tanstack/preact-query';

import { queryClient } from './api/queryClient';
import { ExternalCallWidget } from './components/ExternalCallWidget';
import { WidgetErrorBoundary } from './components/WidgetErrorBoundary';

export const App = () => (
  <QueryClientProvider client={queryClient}>
    <WidgetErrorBoundary>
      <ExternalCallWidget />
    </WidgetErrorBoundary>
  </QueryClientProvider>
);
