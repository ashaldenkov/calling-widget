import { QueryClient, QueryClientProvider } from '@tanstack/preact-query';
import { render } from '@testing-library/preact';
import type { ComponentChildren, VNode } from 'preact';

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
}

export function createQueryClientWrapper() {
  const qc = createQueryClient();
  return ({ children }: { children: ComponentChildren }) => (
    <QueryClientProvider client={qc}>{children}</QueryClientProvider>
  );
}

export function renderWithProviders(ui: VNode) {
  const qc = createQueryClient();
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}
