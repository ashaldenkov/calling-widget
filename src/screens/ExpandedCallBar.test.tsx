import { act, fireEvent, render, screen } from '@testing-library/preact';
import type { TCountryCode } from 'countries-list';

vi.mock('../utils', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../utils')>();
  return { ...actual, useLocalTime: vi.fn().mockReturnValue('09:15') };
});

import { setConfig, widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import type { CustomerData } from '../types/types';
import { CallState } from '../types/types';
import { useLocalTime } from '../utils';

import ExpandedCallBar from './ExpandedCallBar';

const mockCustomer: CustomerData = {
  id: 'cust-1',
  dialerId: 1,
  firstName: 'Jane',
  lastName: 'Smith',
  country: 'DE' as TCountryCode,
  brandName: 'Beta GmbH',
  status: { id: 'st-1', name: 'Available', color: '#00cc00' },
};

beforeEach(() => {
  resetWidgetState();
  widgetState.callState = CallState.Connected;
});

describe('ExpandedCallBar', () => {
  describe('customer information display', () => {
    it('renders the full customer name', () => {
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
    });

    it('renders the brand name', () => {
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(screen.getByText('Beta GmbH')).toBeInTheDocument();
    });

    it('shows "-" when brandName is empty', () => {
      const customer = { ...mockCustomer, brandName: '' };
      render(<ExpandedCallBar customer={customer} onEndCall={vi.fn()} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders the local time returned by useLocalTime', () => {
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(screen.getByText(/09:15/)).toBeInTheDocument();
    });

    it('renders the customer status chip when status is set', () => {
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      expect(screen.getByText('Available')).toBeInTheDocument();
    });

    it('shows "N/A" when customer has no status', () => {
      const customer = { ...mockCustomer, status: null };
      render(<ExpandedCallBar customer={customer} onEndCall={vi.fn()} />);
      expect(screen.getByText('N/A')).toBeInTheDocument();
    });

    it('renders the country as "<code> / <name>" when getCountryData resolves the code', () => {
      const customer = { ...mockCustomer, country: 'CA' as TCountryCode };
      const { container } = render(
        <ExpandedCallBar customer={customer} onEndCall={vi.fn()} />,
      );
      expect(
        container.querySelector('.cw-bar-expanded__country'),
      ).toHaveTextContent('CA / Canada');
    });

    it('renders only the raw country code when getCountryData cannot resolve a name', () => {
      const customer = { ...mockCustomer, country: 'string' as TCountryCode };
      const { container } = render(
        <ExpandedCallBar customer={customer} onEndCall={vi.fn()} />,
      );
      const countryEl = container.querySelector('.cw-bar-expanded__country');
      expect(countryEl).toHaveTextContent('string');
      expect(countryEl?.textContent).not.toMatch(/\//);
    });
  });

  describe('call status label via useSignalEffect', () => {
    it('shows the callStatus label in the label span on mount', () => {
      widgetState.callState = CallState.Ringing;
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const labelEl = document.querySelector(
        '.cw-bar-expanded__call-status .cw-text-body3',
      );
      expect(labelEl?.textContent).toBe('Ringing');
    });

    it("shows 'Calling...' label when callState is Calling", () => {
      widgetState.callState = CallState.Calling;
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const labelEl = document.querySelector(
        '.cw-bar-expanded__call-status .cw-text-body3',
      );
      expect(labelEl?.textContent).toBe('Calling...');
    });

    it('updates the label span reactively when callState changes', async () => {
      widgetState.callState = CallState.Calling;
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      await act(() => {
        widgetState.callState = CallState.Connected;
      });
      const labelEl = document.querySelector(
        '.cw-bar-expanded__call-status .cw-text-body3',
      );
      expect(labelEl?.textContent).toBe('Call Duration:');
    });

    it('keeps durationRef hidden when there is no active duration', () => {
      widgetState.callState = CallState.Calling;
      widgetState.startCallTime = null;
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const durationEl = document.querySelector(
        '.cw-bar-expanded__call-status .cw-text-body1',
      );
      expect(durationEl).toHaveAttribute('hidden');
    });

    it("shows 'Call Duration:' label and a visible HH:MM:SS duration when Connected with a startCallTime", () => {
      vi.useFakeTimers();
      try {
        const now = new Date('2024-01-01T00:00:00Z').getTime();
        vi.setSystemTime(now);
        widgetState.callState = CallState.Connected;
        widgetState.startCallTime = now - 155 * 1000; // 2m 35s
        render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
        const labelEl = document.querySelector(
          '.cw-bar-expanded__call-status .cw-text-body3',
        );
        const durationEl = document.querySelector(
          '.cw-bar-expanded__call-status .cw-text-body1',
        );
        expect(labelEl?.textContent).toBe('Call Duration:');
        expect(durationEl).not.toHaveAttribute('hidden');
        expect(durationEl?.textContent).toBe('00:02:35');
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('error notification', () => {
    it('renders the error notification when widgetState.notification is set before mount', () => {
      widgetState.notification = 'Connection lost';
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const notif = document.querySelector('.cw-notif[data-type="error"]');
      expect(notif).toBeInTheDocument();
      expect(notif).toHaveTextContent('Connection lost');
    });

    it('removes the notification on close while leaving the rest of the bar intact', async () => {
      widgetState.notification = 'Connection lost';
      const { container } = render(
        <ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />,
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
      expect(screen.getByText('Jane Smith')).toBeInTheDocument();
      expect(screen.getByText('Beta GmbH')).toBeInTheDocument();
      expect(screen.getByText('End call')).toBeInTheDocument();
    });
  });

  describe('local time', () => {
    it("passes the customer's country to useLocalTime so the rendered time matches that country", () => {
      const customer = { ...mockCustomer, country: 'JP' as TCountryCode };
      render(<ExpandedCallBar customer={customer} onEndCall={vi.fn()} />);
      expect(useLocalTime).toHaveBeenCalledWith('JP');
    });
  });

  describe('actions', () => {
    it('calls onEndCall when the "End call" button is clicked', () => {
      const onEndCall = vi.fn();
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={onEndCall} />);
      fireEvent.click(screen.getByText('End call'));
      expect(onEndCall).toHaveBeenCalledOnce();
    });

    it('sets widgetState.screen="changeStatus" when the edit status button is clicked', () => {
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const editBtn = document.querySelector('.cw-bar-expanded__status button');
      fireEvent.click(editBtn!);
      expect(widgetState.screen).toBe('changeStatus');
    });

    it('sets widgetState.isCollapsed=true when the collapse button is clicked', () => {
      widgetState.isCollapsed = false;
      render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
      const collapseBtn = document.querySelector(
        '.cw-bar-expanded__header button',
      );
      fireEvent.click(collapseBtn!);
      expect(widgetState.isCollapsed).toBe(true);
    });

    it('falls back to an empty web base URL when config is null', () => {
      // resetWidgetState leaves config null -> webBaseUrl ?? '' takes the ''.
      widgetState.config = null;
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
        fireEvent.click(screen.getByText('Go to profile in Calleague'));
        expect(openSpy).toHaveBeenCalledWith(
          '/customers/cust-1',
          '_blank',
          'noopener',
        );
      } finally {
        openSpy.mockRestore();
      }
    });

    it("opens the customer profile in a new tab when 'Go to profile in Calleague' is clicked", () => {
      setConfig({
        apiBaseUrl: 'https://api.calleague.com',
        webBaseUrl: 'https://app.calleague.com',
        janusWsUrl: 'wss://janus.calleague.com',
      });
      const openSpy = vi.spyOn(window, 'open').mockImplementation(() => null);
      try {
        render(<ExpandedCallBar customer={mockCustomer} onEndCall={vi.fn()} />);
        fireEvent.click(screen.getByText('Go to profile in Calleague'));
        expect(openSpy).toHaveBeenCalledWith(
          'https://app.calleague.com/customers/cust-1',
          '_blank',
          'noopener',
        );
      } finally {
        openSpy.mockRestore();
      }
    });
  });
});
