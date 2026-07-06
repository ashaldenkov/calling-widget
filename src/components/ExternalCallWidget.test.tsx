import { act, fireEvent, screen, waitFor } from '@testing-library/preact';
import type { TCountryCode } from 'countries-list';

// --- Module mocks (hoisted) --------------------------------------------------

const { startCallMock, hangUpRef, releaseCallMock, apiMock } = vi.hoisted(
  () => ({
    startCallMock: vi.fn(),
    hangUpRef: {
      current: vi.fn().mockResolvedValue(undefined),
    } as { current: (() => Promise<void>) | null },
    releaseCallMock: vi.fn(),
    apiMock: vi.fn(),
  }),
);

vi.mock('@formkit/auto-animate', () => ({
  default: vi.fn().mockReturnValue({ destroy: vi.fn() }),
}));

vi.mock('../hooks/useStartCall', () => ({
  useStartCall: () => startCallMock,
}));

vi.mock('../stores/janusStore', () => ({
  hangUpRef,
}));

vi.mock('../utils/tabPresence', () => ({
  releaseCall: releaseCallMock,
}));

vi.mock('../api/api', () => ({
  api: apiMock,
}));

// Lightweight child-screen stubs that expose their props via testids/buttons.
vi.mock('../screens', () => ({
  CompatibilityWarningScreen: ({
    onContinue,
    onDismiss,
  }: {
    onContinue: () => void;
    onDismiss: () => void;
  }) => (
    <div data-testid='compat-screen'>
      <button onClick={onContinue}>compat-continue</button>
      <button onClick={onDismiss}>compat-dismiss</button>
    </div>
  ),
  SipTrunkScreen: ({
    onConfirm,
    onCancel,
  }: {
    onConfirm: (trunkId: string) => void;
    onCancel: () => void;
  }) => (
    <div data-testid='siptrunk-screen'>
      <button onClick={() => onConfirm('trunk-42')}>siptrunk-confirm</button>
      <button onClick={onCancel}>siptrunk-cancel</button>
    </div>
  ),
  ErrorScreen: ({
    onClose,
    message,
  }: {
    onClose: () => void;
    message?: string;
  }) => (
    <div data-testid='error-screen'>
      <span data-testid='error-message'>{message}</span>
      <button onClick={onClose}>error-close</button>
    </div>
  ),
  CollapsedCallBar: ({ onEndCall }: { onEndCall: () => void }) => (
    <div data-testid='collapsed-bar'>
      <button onClick={onEndCall}>collapsed-end</button>
    </div>
  ),
  ExpandedCallBar: ({ onEndCall }: { onEndCall: () => void }) => (
    <div data-testid='expanded-bar'>
      <button onClick={onEndCall}>expanded-end</button>
    </div>
  ),
  ChangeStatusScreen: ({
    onSave,
    onCancel,
  }: {
    onSave: (statusId: string, comment: string) => void | Promise<void>;
    onCancel: () => void;
  }) => (
    <div data-testid='changestatus-screen'>
      <button
        onClick={() => {
          void Promise.resolve(onSave('st-99', 'a comment')).catch(() => {});
        }}
      >
        status-save
      </button>
      <button
        onClick={() => {
          void Promise.resolve(onSave('st-99', '')).catch(() => {});
        }}
      >
        status-save-empty
      </button>
      <button onClick={onCancel}>status-cancel</button>
    </div>
  ),
}));

// Unit under test + real modules (imported AFTER the mocks).
import { eventBus, WidgetEvent } from '../eventBus';
import {
  setCallState,
  setConfig,
  setStatusConfirmedDuringCall,
  widgetState,
} from '../stores/widgetStore';
import { renderWithProviders } from '../test/renderWithProviders';
import { resetWidgetState } from '../test/resetWidgetState';
import type { CustomerData, UpdateStatusResponse } from '../types/types';
import { CallState } from '../types/types';

import { ExternalCallWidget } from './ExternalCallWidget';

const mockCustomer: CustomerData = {
  id: 'cust-1',
  dialerId: 7,
  firstName: 'Jane',
  lastName: 'Smith',
  country: 'DE' as TCountryCode,
  brandName: 'Beta GmbH',
  status: { id: 'st-1', name: 'Available', color: '#00cc00' },
};

const statusResponse: UpdateStatusResponse = {
  status: { id: 'st-99', name: 'Callback', color: '#ff9900' },
  message: 'ok',
};

beforeEach(() => {
  vi.clearAllMocks();
  resetWidgetState();
  hangUpRef.current = vi.fn().mockResolvedValue(undefined);
});

describe('ExternalCallWidget', () => {
  describe('idle', () => {
    it('renders nothing when screen is idle', () => {
      const { container } = renderWithProviders(<ExternalCallWidget />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('screen routing', () => {
    it("renders CompatibilityWarningScreen for screen 'compatibilityWarning'", () => {
      widgetState.screen = 'compatibilityWarning';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('compat-screen')).toBeInTheDocument();
    });

    it("renders SipTrunkScreen for screen 'sipTrunk'", () => {
      widgetState.screen = 'sipTrunk';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('siptrunk-screen')).toBeInTheDocument();
    });

    it("renders ErrorScreen with the error message for screen 'error'", () => {
      widgetState.screen = 'error';
      widgetState.error = 'boom';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('error-screen')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('boom');
    });

    it('renders ErrorScreen with an undefined message when widgetState.error is null', () => {
      widgetState.screen = 'error';
      widgetState.error = null;
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('error-screen')).toBeInTheDocument();
      expect(screen.getByTestId('error-message')).toHaveTextContent('');
    });

    it('renders CollapsedCallBar for calling + collapsed with customerData', () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = true;
      widgetState.screen = 'calling';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('collapsed-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('expanded-bar')).not.toBeInTheDocument();
    });

    it('renders ExpandedCallBar for calling + expanded with customerData', () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = false;
      widgetState.screen = 'calling';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('expanded-bar')).toBeInTheDocument();
      expect(screen.queryByTestId('collapsed-bar')).not.toBeInTheDocument();
    });

    it('renders nothing for calling screen when customerData is missing', () => {
      widgetState.customerData = null;
      widgetState.screen = 'calling';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.queryByTestId('collapsed-bar')).not.toBeInTheDocument();
      expect(screen.queryByTestId('expanded-bar')).not.toBeInTheDocument();
    });

    it("renders ChangeStatusScreen for screen 'changeStatus' with customerData", () => {
      widgetState.customerData = mockCustomer;
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);
      expect(screen.getByTestId('changestatus-screen')).toBeInTheDocument();
    });
  });

  describe('compatibility warning callbacks', () => {
    it("Continue persists the warned flag and routes to 'sipTrunk'", async () => {
      widgetState.screen = 'compatibilityWarning';
      renderWithProviders(<ExternalCallWidget />);
      await act(() => {
        fireEvent.click(screen.getByText('compat-continue'));
      });
      expect(localStorage.getItem('cw-compat-warned')).toBe('1');
      expect(widgetState.screen).toBe('sipTrunk');
    });

    it('Dismiss hangs up, releases the call, resets to idle and collapses', async () => {
      widgetState.screen = 'compatibilityWarning';
      const hangUp = hangUpRef.current!;
      renderWithProviders(<ExternalCallWidget />);
      await act(() => {
        fireEvent.click(screen.getByText('compat-dismiss'));
      });
      expect(hangUp).toHaveBeenCalledOnce();
      expect(releaseCallMock).toHaveBeenCalledOnce();
      expect(widgetState.screen).toBe('idle');
      expect(widgetState.isCollapsed).toBe(true);
    });
  });

  describe('sipTrunk callbacks', () => {
    it('Confirm calls startCall with the chosen trunk id', async () => {
      widgetState.screen = 'sipTrunk';
      renderWithProviders(<ExternalCallWidget />);
      await act(() => {
        fireEvent.click(screen.getByText('siptrunk-confirm'));
      });
      expect(startCallMock).toHaveBeenCalledWith('trunk-42');
    });
  });

  describe('handleEndCall', () => {
    it('active call: collapses and hangs up without releasing or resetting', async () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = false;
      setCallState(CallState.Connected);
      widgetState.screen = 'calling';
      const hangUp = hangUpRef.current!;
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('expanded-end'));
      });

      expect(widgetState.isCollapsed).toBe(true);
      expect(hangUp).toHaveBeenCalledOnce();
      expect(releaseCallMock).not.toHaveBeenCalled();
      expect(widgetState.screen).toBe('calling');
    });

    it("Failed + startCallTime set + not confirmed routes to 'changeStatus'", async () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = true;
      setCallState(CallState.Failed);
      widgetState.startCallTime = Date.now();
      setStatusConfirmedDuringCall(false);
      widgetState.screen = 'calling';
      const hangUp = hangUpRef.current!;
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('collapsed-end'));
      });

      expect(hangUp).toHaveBeenCalledOnce();
      expect(releaseCallMock).toHaveBeenCalledOnce();
      expect(widgetState.screen).toBe('changeStatus');
    });

    it('Failed + startCallTime set + confirmed resets to idle and collapses', async () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = true;
      setCallState(CallState.Failed);
      widgetState.startCallTime = Date.now();
      setStatusConfirmedDuringCall(true);
      widgetState.screen = 'calling';
      const hangUp = hangUpRef.current!;
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('collapsed-end'));
      });

      expect(hangUp).toHaveBeenCalledOnce();
      expect(releaseCallMock).toHaveBeenCalledOnce();
      expect(widgetState.screen).toBe('idle');
      expect(widgetState.isCollapsed).toBe(true);
    });

    it('fallthrough (ended/idle) hangs up, releases, resets and collapses', async () => {
      widgetState.customerData = mockCustomer;
      widgetState.isCollapsed = true;
      setCallState(CallState.Ended);
      widgetState.startCallTime = null;
      widgetState.screen = 'calling';
      const hangUp = hangUpRef.current!;
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('collapsed-end'));
      });

      expect(hangUp).toHaveBeenCalledOnce();
      expect(releaseCallMock).toHaveBeenCalledOnce();
      expect(widgetState.screen).toBe('idle');
      expect(widgetState.isCollapsed).toBe(true);
    });
  });

  describe('WidgetOpened at mount', () => {
    it('emits WidgetOpened when screen is not idle at mount', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      widgetState.screen = 'sipTrunk';
      renderWithProviders(<ExternalCallWidget />);
      expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.WidgetOpened);
    });

    it('does not emit WidgetOpened when idle at mount', () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      renderWithProviders(<ExternalCallWidget />);
      expect(emitSpy).not.toHaveBeenCalledWith(WidgetEvent.WidgetOpened);
    });
  });

  describe('status save', () => {
    it('success during an active call updates status, emits StatusConfirmed and stays on calling', async () => {
      setConfig({
        apiBaseUrl: 'https://api.test',
        webBaseUrl: 'https://app.test',
        janusWsUrl: 'wss://janus.test',
      });
      apiMock.mockResolvedValue(statusResponse);
      const emitSpy = vi.spyOn(eventBus, 'emit');

      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Connected);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      fireEvent.click(screen.getByText('status-save'));

      await waitFor(() => {
        expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.StatusConfirmed, {
          clientId: 555,
          statusId: 'st-99',
          dialerId: 7,
        });
      });

      expect(apiMock).toHaveBeenCalledWith('/customers/7/status', {
        method: 'PATCH',
        data: { statusId: 'st-99', comment: 'a comment' },
      });
      expect(widgetState.customerData?.status).toEqual(statusResponse.status);
      expect(widgetState.statusConfirmedDuringCall).toBe(true);
      expect(widgetState.screen).toBe('calling');
    });

    it('omits the comment field from the request body when the comment is empty', async () => {
      setConfig({
        apiBaseUrl: 'https://api.test',
        webBaseUrl: 'https://app.test',
        janusWsUrl: 'wss://janus.test',
      });
      apiMock.mockResolvedValue(statusResponse);

      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Connected);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      fireEvent.click(screen.getByText('status-save-empty'));

      await waitFor(() => {
        expect(apiMock).toHaveBeenCalledWith('/customers/7/status', {
          method: 'PATCH',
          data: { statusId: 'st-99' },
        });
      });
    });

    it('skips updating customerData when it is cleared before the mutation resolves', async () => {
      setConfig({
        apiBaseUrl: 'https://api.test',
        webBaseUrl: 'https://app.test',
        janusWsUrl: 'wss://janus.test',
      });
      // Resolve the API only after we have nulled customerData, so onSuccess
      // observes widgetState.customerData === null (the guard's else branch).
      let resolveApi: (v: UpdateStatusResponse) => void = () => {};
      apiMock.mockReturnValue(
        new Promise<UpdateStatusResponse>((res) => {
          resolveApi = res;
        }),
      );

      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Connected);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      fireEvent.click(screen.getByText('status-save'));

      await waitFor(() => expect(apiMock).toHaveBeenCalledOnce());

      // Clear customerData while the request is in flight.
      widgetState.customerData = null;

      await act(async () => {
        resolveApi(statusResponse);
        await Promise.resolve();
      });

      // The setCustomerData branch was skipped: customerData stays null.
      expect(widgetState.customerData).toBeNull();
    });

    it('success when the call has ended emits StatusConfirmed then resets to idle', async () => {
      setConfig({
        apiBaseUrl: 'https://api.test',
        webBaseUrl: 'https://app.test',
        janusWsUrl: 'wss://janus.test',
      });
      apiMock.mockResolvedValue(statusResponse);
      const emitSpy = vi.spyOn(eventBus, 'emit');

      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Ended);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      fireEvent.click(screen.getByText('status-save'));

      await waitFor(() => {
        expect(emitSpy).toHaveBeenCalledWith(
          WidgetEvent.StatusConfirmed,
          expect.objectContaining({ clientId: 555, statusId: 'st-99' }),
        );
      });
      expect(widgetState.screen).toBe('idle');
    });

    it('error emits Error with the error message', async () => {
      setConfig({
        apiBaseUrl: 'https://api.test',
        webBaseUrl: 'https://app.test',
        janusWsUrl: 'wss://janus.test',
      });
      apiMock.mockRejectedValue(new Error('save failed'));
      const emitSpy = vi.spyOn(eventBus, 'emit');

      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Connected);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      fireEvent.click(screen.getByText('status-save'));

      await waitFor(() => {
        expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.Error, {
          message: 'save failed',
        });
      });
    });
  });

  describe('status cancel', () => {
    it('during an active call routes back to calling', async () => {
      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Connected);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('status-cancel'));
      });

      expect(widgetState.screen).toBe('calling');
    });

    it('when the call has ended emits StatusChangeSkipped and resets to idle', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      widgetState.customerData = mockCustomer;
      widgetState.extCustomerId = 555;
      setCallState(CallState.Ended);
      widgetState.screen = 'changeStatus';
      renderWithProviders(<ExternalCallWidget />);

      await act(() => {
        fireEvent.click(screen.getByText('status-cancel'));
      });

      expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.StatusChangeSkipped, {
        clientId: 555,
      });
      expect(widgetState.screen).toBe('idle');
    });
  });
});
