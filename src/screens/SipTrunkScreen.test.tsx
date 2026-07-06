import { QueryClient, QueryClientProvider } from '@tanstack/preact-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/preact';
import type { TCountryCode } from 'countries-list';
import type { VNode } from 'preact';

// Silence the auto-animate ref plumbing used by TrunkList / ConfirmationDialog.
vi.mock('@formkit/auto-animate/preact', () => ({
  useAutoAnimate: () => [{ current: null }],
}));

vi.mock('../api/api', () => ({
  api: vi.fn(),
}));

vi.mock('../utils/micPermission', () => ({
  probeMicPermission: vi.fn(),
}));

vi.mock('../utils/phoneEncryption', () => ({
  encryptPhoneNumber: vi.fn(),
}));

import { api } from '../api/api';
import {
  ERR_CUSTOMER_IN_CALL,
  ERR_GENERIC,
  ERR_MIC_DISCONNECTED,
  ERR_MIC_PERMISSION,
  ERR_NO_TRUNKS,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import { setCallParams, setConfig, widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import type {
  CustomerData,
  TrunkListItem,
  TrunkResponse,
} from '../types/types';
import type { MicPermissionState } from '../utils/micPermission';
import { probeMicPermission } from '../utils/micPermission';
import { encryptPhoneNumber } from '../utils/phoneEncryption';

import SipTrunkScreen from './SipTrunkScreen';

const mockApi = vi.mocked(api);
const mockProbeMic = vi.mocked(probeMicPermission);
const mockEncrypt = vi.mocked(encryptPhoneNumber);

const trunk = (id: string, name: string): TrunkListItem => ({
  id,
  name,
  brandId: 'b1',
  isDefault: false,
  status: 'active',
  enabled: true,
  minuteCost: 0,
});

const customerInfo: CustomerData = {
  id: 'cust-1',
  dialerId: 42,
  firstName: 'Jane',
  lastName: 'Smith',
  country: 'DE' as TCountryCode,
  brandName: 'Beta GmbH',
  status: null,
};

const defaultTrunks = [trunk('t1', 'Main Trunk'), trunk('t2', 'Backup Trunk')];

const trunkResponse = (
  trunks: TrunkListItem[] = defaultTrunks,
): TrunkResponse => ({
  trunks,
  customerInfo,
});

// The disabled `checkInCall` useQuery has no queryFn of its own, so its
// refetch() falls back to the QueryClient's default query fn. We control the
// resolved/rejected value of that default fn per-test via `inCallResult`, which
// keeps the query behaviour real while letting us drive inCall true/false/error.
let inCallResult: { resolve?: { inCall: boolean }; reject?: unknown };

function renderScreen(ui: VNode) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        // eslint-disable-next-line @typescript-eslint/require-await
        queryFn: async () => {
          if (inCallResult.reject !== undefined) {
            // Intentionally rejecting with a non-Error to exercise the
            // getErrorMessage(err, ERR_GENERIC) fallback branch.
            // eslint-disable-next-line @typescript-eslint/only-throw-error
            throw inCallResult.reject;
          }
          return inCallResult.resolve ?? { inCall: false };
        },
      },
      mutations: { retry: false },
    },
  });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

beforeEach(() => {
  vi.clearAllMocks();
  resetWidgetState();
  setConfig({
    apiBaseUrl: 'https://api.calleague.com',
    webBaseUrl: 'https://app.calleague.com',
    janusWsUrl: 'wss://janus.calleague.com',
  });
  setCallParams({
    apiKey: 'key-123',
    extCustomerId: 100,
    extAgentId: 200,
    phoneNumber: '+15551234567',
  });
  inCallResult = { resolve: { inCall: false } };
  mockEncrypt.mockResolvedValue('encrypted-phone');
  mockProbeMic.mockResolvedValue('granted');
  mockApi.mockResolvedValue(trunkResponse());
});

// The dialog is always mounted (its visibility is toggled), so there are two
// "Confirm" buttons in the DOM. The outer one lives in .cw-screen-actions and
// only opens the dialog; the dialog's own "Confirm" (in .cw-dialog__actions)
// triggers handleCallConfirm.
const outerConfirmBtn = () =>
  document.querySelector<HTMLButtonElement>(
    '.cw-screen-actions button:last-child',
  );

const dialogConfirmBtn = () =>
  document.querySelector<HTMLButtonElement>(
    '.cw-dialog__actions button:last-child',
  );

const openDialogConfirm = async () => {
  await act(() => {
    fireEvent.click(outerConfirmBtn()!);
  });
  return dialogConfirmBtn();
};

const confirmCall = async () => {
  const dialogConfirm = await openDialogConfirm();
  await act(() => {
    fireEvent.click(dialogConfirm!);
  });
};

describe('SipTrunkScreen', () => {
  describe('trunk loading', () => {
    it('auto-selects the first trunk as default and stores customerInfo', async () => {
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      // customerInfo persisted to the store (effect runs after the list paints)
      await waitFor(() => {
        expect(widgetState.customerData?.id).toBe(customerInfo.id);
      });
      expect(widgetState.customerData?.dialerId).toBe(customerInfo.dialerId);
      // first trunk row is marked selected
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).toHaveAttribute('data-selected');
      expect(rows[1]).not.toHaveAttribute('data-selected');
    });

    it('honors an already-set widgetState.selectedTrunkId instead of the first trunk', async () => {
      widgetState.selectedTrunkId = 't2';
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Backup Trunk')).toBeInTheDocument();
      });
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).not.toHaveAttribute('data-selected');
      expect(rows[1]).toHaveAttribute('data-selected');
    });

    it('skips phone encryption and sends phoneNumberEnc undefined when there is no phone number', async () => {
      widgetState.phoneNumber = null;
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      expect(mockEncrypt).not.toHaveBeenCalled();
      expect(mockApi).toHaveBeenCalledWith(
        '/widget/trunks-for-call',
        expect.objectContaining({
          data: expect.objectContaining({ phoneNumberEnc: undefined }),
        }),
      );
    });

    it('routes to the error screen with ERR_NO_TRUNKS when zero trunks are returned', async () => {
      mockApi.mockResolvedValue(trunkResponse([]));
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(widgetState.screen).toBe('error');
      });
      expect(widgetState.error).toBe(ERR_NO_TRUNKS);
    });

    it('routes to the error screen with ERR_GENERIC when the trunks query fails', async () => {
      mockApi.mockRejectedValue(new Error('boom network'));
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(widgetState.screen).toBe('error');
      });
      // handleWidgetError(ERR_GENERIC, error) surfaces the Error's message
      expect(widgetState.error).toBe('boom network');
    });
  });

  describe('search / confirm-button enablement', () => {
    it('filters the trunk list and disables Confirm when the selected trunk is filtered out', async () => {
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });

      // 't1' (Main Trunk) is auto-selected; search for the other trunk only.
      const input = document.querySelector<HTMLInputElement>('input');
      await act(() => {
        fireEvent.input(input!, { target: { value: 'Backup' } });
      });

      await waitFor(() => {
        expect(screen.queryByText('Main Trunk')).not.toBeInTheDocument();
      });
      expect(screen.getByText('Backup Trunk')).toBeInTheDocument();

      expect(outerConfirmBtn()).toBeDisabled();
    });
  });

  describe('call confirmation flow', () => {
    it('shows ERR_MIC_PERMISSION and does not call onConfirm when mic is denied', async () => {
      mockProbeMic.mockResolvedValue('denied');
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText(ERR_MIC_PERMISSION)).toBeInTheDocument();
      });
      expect(onConfirm).not.toHaveBeenCalled();
    });

    it.each<MicPermissionState>(['noDevice', 'failed'])(
      'shows ERR_MIC_DISCONNECTED when mic probe returns %s',
      async (state) => {
        mockProbeMic.mockResolvedValue(state);
        const onConfirm = vi.fn().mockResolvedValue(undefined);
        renderScreen(
          <SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />,
        );

        await waitFor(() => {
          expect(screen.getByText('Main Trunk')).toBeInTheDocument();
        });
        await confirmCall();

        await waitFor(() => {
          expect(screen.getByText(ERR_MIC_DISCONNECTED)).toBeInTheDocument();
        });
        expect(onConfirm).not.toHaveBeenCalled();
      },
    );

    it('shows ERR_CUSTOMER_IN_CALL and does not call onConfirm when the customer is already in a call', async () => {
      inCallResult = { resolve: { inCall: true } };
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText(ERR_CUSTOMER_IN_CALL)).toBeInTheDocument();
      });
      expect(onConfirm).not.toHaveBeenCalled();

      // The error is surfaced inside the still-open confirmation dialog rather
      // than dismissing it — the agent can read it and retry without reopening.
      const dialog = document.querySelector('.cw-dialog');
      expect(dialog).toHaveAttribute('data-open');
      expect(dialog).toContainElement(screen.getByText(ERR_CUSTOMER_IN_CALL));
      // dialog confirm is re-enabled (isStarting reset) so a retry is possible
      expect(dialogConfirmBtn()).not.toBeDisabled();
    });

    it('selects the trunk, emits TrunkSelected and awaits onConfirm on the happy path', async () => {
      const emitSpy = vi.spyOn(eventBus, 'emit');
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalledWith('t1');
      });
      expect(widgetState.selectedTrunkId).toBe('t1');
      expect(emitSpy).toHaveBeenCalledWith(WidgetEvent.TrunkSelected, {
        trunkId: 't1',
        trunkName: 'Main Trunk',
      });
    });

    it('surfaces the error message and stops loading when onConfirm rejects', async () => {
      const onConfirm = vi
        .fn()
        .mockRejectedValue(new Error('start failed badly'));
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText('start failed badly')).toBeInTheDocument();
      });
      // isStarting reset -> dialog confirm button re-enabled
      expect(dialogConfirmBtn()).not.toBeDisabled();
    });

    it('surfaces ERR_GENERIC when the in-call check errors with a non-Error', async () => {
      // getErrorMessage falls back to ERR_GENERIC when the thrown value is not an Error.
      inCallResult = { reject: 'in-call check exploded' };
      const onConfirm = vi.fn().mockResolvedValue(undefined);
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText(ERR_GENERIC)).toBeInTheDocument();
      });
      expect(onConfirm).not.toHaveBeenCalled();
    });
  });

  describe('cancellation', () => {
    it('calls onCancel when the outer Cancel button is clicked', async () => {
      const onCancel = vi.fn();
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={onCancel}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      const outerCancel = document.querySelector<HTMLButtonElement>(
        '.cw-screen-actions button:first-child',
      );
      fireEvent.click(outerCancel!);
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('closes the dialog and clears the error when Cancel is clicked while not starting', async () => {
      // Seed an error inside the open dialog via the in-call path, then Cancel.
      inCallResult = { resolve: { inCall: true } };
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText(ERR_CUSTOMER_IN_CALL)).toBeInTheDocument();
      });

      // isStarting is false now -> Cancel falls through the guard and closes.
      const dialogCancel = document.querySelector<HTMLButtonElement>(
        '.cw-dialog__actions button:first-child',
      );
      expect(dialogCancel).not.toBeDisabled();
      await act(() => {
        fireEvent.click(dialogCancel!);
      });

      await waitFor(() => {
        expect(document.querySelector('.cw-dialog')).not.toHaveAttribute(
          'data-open',
        );
      });
      // callError cleared alongside the close.
      expect(screen.queryByText(ERR_CUSTOMER_IN_CALL)).not.toBeInTheDocument();
    });

    it('clears the error via onErrorClose when the in-dialog error notification is dismissed', async () => {
      inCallResult = { resolve: { inCall: true } };
      renderScreen(
        <SipTrunkScreen
          onConfirm={vi.fn().mockResolvedValue(undefined)}
          onCancel={vi.fn()}
        />,
      );

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      await waitFor(() => {
        expect(screen.getByText(ERR_CUSTOMER_IN_CALL)).toBeInTheDocument();
      });

      // Dismiss the notification -> onErrorClose -> setCallError(null).
      const errorCloseBtn = document.querySelector<HTMLButtonElement>(
        '.cw-notif[data-type="error"] button',
      );
      expect(errorCloseBtn).toBeTruthy();
      await act(() => {
        fireEvent.click(errorCloseBtn!);
      });

      await waitFor(() => {
        expect(
          screen.queryByText(ERR_CUSTOMER_IN_CALL),
        ).not.toBeInTheDocument();
      });
      // The dialog itself stays open — only the error was cleared.
      expect(document.querySelector('.cw-dialog')).toHaveAttribute('data-open');
    });

    it('blocks dialog cancellation (Escape) while a call is starting', async () => {
      // Hold onConfirm pending so isStarting stays true during the assertion.
      let releaseConfirm: () => void = () => {};
      const onConfirm = vi.fn().mockReturnValue(
        new Promise<void>((resolve) => {
          releaseConfirm = resolve;
        }),
      );
      renderScreen(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

      await waitFor(() => {
        expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      });
      await confirmCall();

      // The dialog is open and in the starting state.
      await waitFor(() => {
        expect(onConfirm).toHaveBeenCalled();
      });
      const dialog = document.querySelector('.cw-dialog');
      expect(dialog).toHaveAttribute('data-open');

      // Escape triggers onCancel -> blocked because isStarting is true.
      await act(() => {
        fireEvent.keyDown(document, { key: 'Escape' });
      });
      expect(dialog).toHaveAttribute('data-open');

      // Cleanly resolve the pending confirm.
      await act(() => {
        releaseConfirm();
      });
    });
  });
});
