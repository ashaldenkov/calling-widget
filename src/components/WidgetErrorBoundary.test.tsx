import { render, screen } from '@testing-library/preact';
import userEvent from '@testing-library/user-event';

vi.mock('../screens/ErrorScreen', () => ({
  default: ({ onClose }: { onClose: () => void }) => (
    <button type='button' onClick={onClose} data-testid='error-close'>
      Close error
    </button>
  ),
}));

import { eventBus, WidgetEvent } from '../eventBus';
import { widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';

import { WidgetErrorBoundary } from './WidgetErrorBoundary';

function ThrowingChild({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) throw new Error('render boom');
  return <p data-testid='child'>child content</p>;
}

beforeEach(() => {
  resetWidgetState();
  // Suppress the noise from expected render errors in error-boundary tests
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('WidgetErrorBoundary', () => {
  describe('happy path — no error', () => {
    it('renders children when nothing throws', () => {
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </WidgetErrorBoundary>,
      );
      expect(screen.getByTestId('child')).toBeInTheDocument();
    });

    it('does not show the error fallback when children render successfully', () => {
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </WidgetErrorBoundary>,
      );
      expect(screen.queryByTestId('error-close')).not.toBeInTheDocument();
    });
  });

  describe('error path — child throws during render', () => {
    it('renders the ErrorScreen fallback instead of the failed child', () => {
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      expect(screen.getByTestId('error-close')).toBeInTheDocument();
      expect(screen.queryByTestId('child')).not.toBeInTheDocument();
    });

    it('wraps the ErrorScreen in the cw-paper container', () => {
      const { container } = render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      expect(container.querySelector('.cw-paper')).not.toBeNull();
    });

    it('emits the Error event with the thrown error message via componentDidCatch', () => {
      const spy = vi.spyOn(eventBus, 'emit');
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      expect(spy).toHaveBeenCalledWith(WidgetEvent.Error, {
        message: 'render boom',
      });
    });

    it('emits an empty string when error.message is empty — ERR_RENDER is only for non-Error throws', () => {
      // getErrorMessage(error, ERR_RENDER) returns error.message for any Error instance,
      // even if that message is ''. The fallback only activates for non-Error values.
      const spy = vi.spyOn(eventBus, 'emit');
      function EmptyMsgThrower(): never {
        throw new Error('');
      }
      render(
        <WidgetErrorBoundary>
          <EmptyMsgThrower />
        </WidgetErrorBoundary>,
      );
      expect(spy).toHaveBeenCalledWith(WidgetEvent.Error, { message: '' });
    });
  });

  describe('close / recovery', () => {
    it('clicking close resets widgetState to idle', async () => {
      widgetState.screen = 'calling';
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      await userEvent.click(screen.getByTestId('error-close'));
      expect(widgetState.screen).toBe('idle');
    });

    it('clicking close emits WidgetDismissed', async () => {
      const spy = vi.spyOn(eventBus, 'emit');
      render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      await userEvent.click(screen.getByTestId('error-close'));
      expect(spy).toHaveBeenCalledWith(WidgetEvent.WidgetDismissed);
    });

    it('clears the error state after close so children can render again', async () => {
      const { rerender } = render(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow />
        </WidgetErrorBoundary>,
      );
      expect(screen.getByTestId('error-close')).toBeInTheDocument();

      rerender(
        <WidgetErrorBoundary>
          <ThrowingChild shouldThrow={false} />
        </WidgetErrorBoundary>,
      );
      await userEvent.click(screen.getByTestId('error-close'));

      expect(screen.getByTestId('child')).toBeInTheDocument();
      expect(screen.queryByTestId('error-close')).not.toBeInTheDocument();
    });
  });
});
