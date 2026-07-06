import { render, screen } from '@testing-library/preact';

vi.mock('./components/ExternalCallWidget', () => ({
  ExternalCallWidget: () => <div data-testid='external-call-widget' />,
}));

import { App } from './App';

it('mounts the widget inside the query + error-boundary provider tree', () => {
  expect(() => render(<App />)).not.toThrow();
  expect(screen.getByTestId('external-call-widget')).toBeInTheDocument();
});
