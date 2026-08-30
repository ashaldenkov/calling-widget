import { act, fireEvent, render, screen } from '@testing-library/preact';

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return { ...actual, useLocalTime: vi.fn().mockReturnValue('14:30') };
});

import { setNotification, widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import type { CustomerData } from '../types/types';
import { CallState } from '../types/types';
import { useLocalTime } from '../utils';

import CollapsedCallBar from './CollapsedCallBar';

const mockCustomer: CustomerData = {
  id: 'cust-1',
  firstName: 'John',
  lastName: 'Doe',
  country: 'US',
  brandName: 'Acme Corp',
  status: null,
};

beforeEach(() => {
  resetWidgetState();
  widgetState.callState = CallState.Connected;
});

describe('CollapsedCallBar', () => {
  describe('customer information display', () => {
    it('renders the full customer name', () => {
      const { container } = render(
        <CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />,
      );
      // Tooltip duplicates title into DOM — use container text check to avoid multiple-match error
      expect(container).toHaveTextContent('John Doe');
    });

    it('renders the brand name', () => {
      const { container } = render(
        <CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />,
      );
      expect(container).toHaveTextContent('Acme Corp');
    });

    it('shows "-" when brandName is empty', () => {
      const customer = { ...mockCustomer, brandName: '' };
      const { container } = render(
        <CollapsedCallBar customer={customer} onEndCall={vi.fn()} />,
      );
      expect(container.querySelector('.cw-bar__names')).toHaveTextContent('-');
    });

    it('renders the country as "<code> / <name>" when getCountryData resolves the code', () => {
      const customer = { ...mockCustomer, country: 'CA' };
      const { container } = render(
        <CollapsedCallBar customer={customer} onEndCall={vi.fn()} />,
      );
      expect(container.querySelector('.cw-bar__country')).toHaveTextContent(
        'CA / Canada',
      );
    });

    it('renders only the raw country code when getCountryData cannot resolve a name', () => {
      const customer = { ...mockCustomer, country: 'string' };
      const { container } = render(
        <CollapsedCallBar customer={customer} onEndCall={vi.fn()} />,
      );
      const countryEl = container.querySelector('.cw-bar__country');
      expect(countryEl).toHaveTextContent('string');
      expect(countryEl?.textContent).not.toMatch(/\//);
    });

    it('renders the local time returned by useLocalTime', () => {
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(screen.getByText(/14:30/)).toBeInTheDocument();
    });
  });

  describe('call status label via useSignalEffect', () => {
    it('reflects callStatus.label in the status span on mount', () => {
      widgetState.callState = CallState.Calling;
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(document.querySelector('.cw-bar__status-text')?.textContent).toBe(
        'Calling...',
      );
    });

    it('updates the status span reactively when callState changes', async () => {
      widgetState.callState = CallState.Calling;
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      await act(() => {
        widgetState.callState = CallState.Ringing;
      });
      expect(document.querySelector('.cw-bar__status-text')?.textContent).toBe(
        'Ringing',
      );
    });

    it('renders the formatted call duration (HH:MM:SS) in the status span when Connected with a startCallTime', () => {
      vi.useFakeTimers();
      try {
        const now = new Date('2024-01-01T00:00:00Z').getTime();
        vi.setSystemTime(now);
        widgetState.callState = CallState.Connected;
        widgetState.startCallTime = now - 155 * 1000; // 2m 35s ago
        render(
          <CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />,
        );
        const statusEl = document.querySelector(
          '.cw-bar__status-text',
        ) as HTMLElement;
        expect(statusEl?.textContent).toBe('00:02:35');
        expect(statusEl?.dataset.mode).toBe('duration');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('error notification', () => {
    it('renders the error notification when widgetState.notification is set before mount', () => {
      widgetState.notification = 'Something went wrong';
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const notif = document.querySelector('.cw-notif[data-type="error"]');
      expect(notif).toBeInTheDocument();
      expect(notif).toHaveTextContent('Something went wrong');
    });

    it('removes the notification on close while leaving the rest of the bar intact', async () => {
      widgetState.notification = 'Boom';
      const { container } = render(
        <CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />,
      );
      const closeBtn = container.querySelector<HTMLButtonElement>(
        '.cw-notif[data-type="error"] button',
      );
      expect(closeBtn).toBeTruthy();
      if (!closeBtn) return;

      await act(() => {
        fireEvent.click(closeBtn);
      });

      expect(
        container.querySelector('.cw-notif[data-type="error"]'),
      ).not.toBeInTheDocument();
      expect(widgetState.notification).toBeNull();
      // surrounding UI still present
      expect(container).toHaveTextContent('John Doe');
      expect(container).toHaveTextContent('Acme Corp');
      expect(container.querySelector('.cw-bar__country')).toBeInTheDocument();
    });

    it('does not render the error notification when widgetState.notification is null', () => {
      setNotification(null);
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(
        document.querySelector('.cw-notif[data-type="error"]'),
      ).not.toBeInTheDocument();
    });
  });

  describe('local time', () => {
    it("passes the customer's country to useLocalTime so the rendered time matches that country", () => {
      const customer = { ...mockCustomer, country: 'JP' };
      render(<CollapsedCallBar customer={customer} onEndCall={vi.fn()} />);
      expect(useLocalTime).toHaveBeenCalledWith('JP');
    });
  });

  describe('actions', () => {
    // Button order inside .cw-bar__actions: [0] MuteIconButton, [1] End call, [2] Expand
    it('calls onEndCall when the end-call button is clicked', () => {
      const onEndCall = vi.fn();
      render(
        <CollapsedCallBar customer={mockCustomer} onEndCall={onEndCall} />,
      );
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[1]); // index 1 = end-call IconButton
      expect(onEndCall).toHaveBeenCalledOnce();
    });

    it('sets widgetState.isCollapsed=false when the expand button is clicked', () => {
      widgetState.isCollapsed = true;
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      fireEvent.click(buttons[buttons.length - 1]); // last = expand (ArrowDropUpIcon)
      expect(widgetState.isCollapsed).toBe(false);
    });

    it('disables the end-call button while the call is ending', () => {
      widgetState.isEnding = true;
      render(<CollapsedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const buttons = screen.getAllByRole('button');
      expect(buttons[1]).toBeDisabled(); // index 1 = end-call IconButton
    });
  });
});
