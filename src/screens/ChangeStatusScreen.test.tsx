import { QueryClientProvider } from '@tanstack/preact-query';
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/preact';
import type { TCountryCode } from 'countries-list';

vi.mock('../api/api', () => ({ api: vi.fn() }));

// useRef is mocked to defer to the real implementation by default; individual
// tests can force specific refs to stay null to exercise the null-guard paths.
const useRefMock = vi.hoisted(() =>
  vi.fn<() => { current: unknown } | undefined>(),
);

vi.mock('preact/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('preact/hooks')>();
  return {
    ...actual,
    useRef: <T,>(init: T) => useRefMock() ?? actual.useRef<T>(init),
  };
});

const nullRef = () =>
  Object.defineProperty({} as { current: unknown }, 'current', {
    get: () => null,
    set: () => undefined,
  });

import { api } from '../api/api';
import { ERR_GENERIC } from '../errors';
import { setCustomerData } from '../stores/widgetStore';
import { createQueryClient } from '../test/renderWithProviders';
import { resetWidgetState } from '../test/resetWidgetState';
import type {
  CustomerData,
  StatusesResponse,
  StatusOption,
} from '../types/types';

import ChangeStatusScreen from './ChangeStatusScreen';

const mockedApi = vi.mocked(api);

const status = (id: string, name: string): StatusOption => ({
  id,
  name,
  color: '#aabbcc',
});

const page = (
  items: StatusOption[],
  overrides: Partial<StatusesResponse['pageInfo']> = {},
): StatusesResponse => ({
  items,
  pageInfo: {
    page: 1,
    perPage: 25,
    total: items.length,
    totalPages: 1,
    hasNextPage: false,
    hasPreviousPage: false,
    ...overrides,
  },
});

const customerWithStatus = (
  s: CustomerData['status'] = { id: 's1', name: 'Available', color: '#00cc00' },
): CustomerData => ({
  id: 'cust-1',
  dialerId: 1,
  firstName: 'Jane',
  lastName: 'Smith',
  country: 'DE' as TCountryCode,
  brandName: 'Beta GmbH',
  status: s,
});

const renderScreen = (props?: {
  onSave?: (statusId: string, comment: string) => Promise<void>;
  onCancel?: () => void;
}) => {
  const onSave =
    props?.onSave ?? vi.fn<(id: string, c: string) => Promise<void>>();
  const onCancel = props?.onCancel ?? vi.fn();
  const qc = createQueryClient();
  const result = render(
    <QueryClientProvider client={qc}>
      <ChangeStatusScreen onSave={onSave} onCancel={onCancel} />
    </QueryClientProvider>,
  );
  return { ...result, onSave, onCancel };
};

const saveButton = () =>
  screen.getByText('Save').closest('button') as HTMLButtonElement;
const cancelButton = () =>
  screen.getByText('Cancel').closest('button') as HTMLButtonElement;

beforeEach(() => {
  vi.clearAllMocks();
  resetWidgetState();
  // Default: always defer to the real useRef.
  useRefMock.mockReturnValue(undefined);
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
  // Default: single page of results, resolved immediately.
  mockedApi.mockResolvedValue(
    page([status('s1', 'Available'), status('s2', 'Busy')]),
  );
});

describe('ChangeStatusScreen', () => {
  describe('current status pinning', () => {
    it('pins the current status first and de-duplicates it from the pages when there is no search', async () => {
      setCustomerData(
        customerWithStatus({ id: 's2', name: 'Busy', color: '#ff0000' }),
      );
      mockedApi.mockResolvedValue(
        page([status('s1', 'Available'), status('s2', 'Busy')]),
      );

      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );

      // "Busy" (the current status) appears exactly once, pinned first.
      const busyRows = screen.getAllByText('Busy');
      expect(busyRows).toHaveLength(1);
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).toHaveTextContent('Busy');
      expect(rows[1]).toHaveTextContent('Available');
    });

    it('renders only page items (unpinned) when there is no current status', async () => {
      setCustomerData(customerWithStatus(null));
      mockedApi.mockResolvedValue(
        page([status('s1', 'Available'), status('s2', 'Busy')]),
      );

      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).toHaveTextContent('Available');
      expect(rows[1]).toHaveTextContent('Busy');
    });
  });

  describe('search interaction', () => {
    it('does NOT pin the current status while a search is active, and restores the pin after clearing', async () => {
      vi.useFakeTimers({ shouldAdvanceTime: true });
      try {
        setCustomerData(
          customerWithStatus({ id: 'sx', name: 'Offline', color: '#333' }),
        );
        // No search -> pinned "Offline" plus page items.
        mockedApi.mockImplementation((_path, opts) => {
          const search = opts?.params?.search;
          if (search === 'ava') {
            return Promise.resolve(page([status('s1', 'Available')]));
          }
          return Promise.resolve(
            page([status('s1', 'Available'), status('s2', 'Busy')]),
          );
        });

        renderScreen();

        await waitFor(() =>
          expect(screen.getByText('Available')).toBeInTheDocument(),
        );
        // Pinned before search.
        expect(screen.getByText('Offline')).toBeInTheDocument();

        const input = document.querySelector('input') as HTMLInputElement;
        fireEvent.input(input, { target: { value: 'ava' } });
        // Flush the 250ms debounce in SearchField.
        await act(async () => {
          await vi.advanceTimersByTimeAsync(300);
        });

        await waitFor(() =>
          expect(screen.getByText('Available')).toBeInTheDocument(),
        );
        // Current status is NOT pinned during an active search.
        expect(screen.queryByText('Offline')).not.toBeInTheDocument();

        // Clear the search -> pin restored.
        const clearBtn = document.querySelector(
          '.cw-screen-change-status__main button',
        ) as HTMLButtonElement;
        fireEvent.click(clearBtn);
        await act(async () => {
          await vi.advanceTimersByTimeAsync(300);
        });

        await waitFor(() =>
          expect(screen.getByText('Offline')).toBeInTheDocument(),
        );
      } finally {
        vi.useRealTimers();
      }
    });
  });

  describe('Save button disabled states', () => {
    it('is disabled while the query is loading (nothing resolved, no selection)', () => {
      setCustomerData(customerWithStatus(null));
      // Never resolves -> stays loading.
      mockedApi.mockReturnValue(new Promise<StatusesResponse>(() => {}));

      renderScreen();

      expect(saveButton()).toBeDisabled();
    });

    it('is disabled when nothing is selected (no current status)', async () => {
      setCustomerData(customerWithStatus(null));
      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      expect(saveButton()).toBeDisabled();
    });

    it('is disabled on query error', async () => {
      setCustomerData(customerWithStatus());
      mockedApi.mockRejectedValue(new Error('boom'));

      renderScreen();

      await waitFor(() => expect(saveButton()).toBeDisabled());
    });

    it('is disabled when the comment is invalid (too long) even with a selection', async () => {
      setCustomerData(customerWithStatus());
      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      // Current status is pre-selected, so Save is enabled first.
      expect(saveButton()).not.toBeDisabled();

      const commentInput = screen.getByPlaceholderText('Type your comment');
      fireEvent.input(commentInput, {
        target: { value: 'x'.repeat(501) },
      });

      await waitFor(() => expect(saveButton()).toBeDisabled());
    });

    it('is enabled once a status is selected and comment is valid', async () => {
      setCustomerData(customerWithStatus(null));
      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      expect(saveButton()).toBeDisabled();

      fireEvent.click(screen.getByText('Available'));

      await waitFor(() => expect(saveButton()).not.toBeDisabled());
    });
  });

  describe('save happy path', () => {
    it('calls onSave with the selected status id and the raw comment string', async () => {
      setCustomerData(customerWithStatus(null));
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderScreen({ onSave });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      fireEvent.click(screen.getByText('Busy'));

      const commentInput = screen.getByPlaceholderText('Type your comment');
      fireEvent.input(commentInput, { target: { value: 'call back later' } });

      await waitFor(() => expect(saveButton()).not.toBeDisabled());
      await act(() => {
        fireEvent.click(saveButton());
      });

      expect(onSave).toHaveBeenCalledWith('s2', 'call back later');
    });

    it('passes an empty string comment when the comment field is untouched', async () => {
      setCustomerData(customerWithStatus());
      const onSave = vi.fn().mockResolvedValue(undefined);
      renderScreen({ onSave });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      await waitFor(() => expect(saveButton()).not.toBeDisabled());
      await act(() => {
        fireEvent.click(saveButton());
      });

      expect(onSave).toHaveBeenCalledWith('s1', '');
    });
  });

  describe('save error handling', () => {
    it('shows an error notification when onSave rejects and clears it on close', async () => {
      setCustomerData(customerWithStatus());
      const onSave = vi.fn().mockRejectedValue(new Error('nope'));
      renderScreen({ onSave });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      await waitFor(() => expect(saveButton()).not.toBeDisabled());

      await act(() => {
        fireEvent.click(saveButton());
      });

      const notif = await waitFor(() => {
        const el = document.querySelector('.cw-notif[data-type="error"]');
        expect(el).toBeInTheDocument();
        return el as HTMLElement;
      });
      expect(notif).toHaveTextContent('nope');

      // isSubmitting was reset -> Save is enabled again.
      expect(saveButton()).not.toBeDisabled();

      const closeBtn = notif.querySelector('button') as HTMLButtonElement;
      await act(() => {
        fireEvent.click(closeBtn);
      });

      expect(
        document.querySelector('.cw-notif[data-type="error"]'),
      ).not.toBeInTheDocument();
    });

    it('falls back to the generic error message when the thrown error has no message', async () => {
      setCustomerData(customerWithStatus());
      const onSave = vi.fn().mockRejectedValue('weird');
      renderScreen({ onSave });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      await waitFor(() => expect(saveButton()).not.toBeDisabled());

      await act(() => {
        fireEvent.click(saveButton());
      });

      await waitFor(() =>
        expect(screen.getByText(ERR_GENERIC)).toBeInTheDocument(),
      );
    });
  });

  describe('infinite scroll', () => {
    it('fetches the next page when the sentinel intersects and there is a next page', async () => {
      const observerCallbacks: Array<
        (entries: IntersectionObserverEntry[]) => void
      > = [];
      vi.stubGlobal(
        'IntersectionObserver',
        class {
          constructor(cb: (entries: IntersectionObserverEntry[]) => void) {
            observerCallbacks.push(cb);
          }
          observe = vi.fn();
          disconnect = vi.fn();
        },
      );

      setCustomerData(customerWithStatus(null));
      mockedApi.mockImplementation((_path, opts) => {
        const pageParam = (opts?.params?.page as number) ?? 1;
        if (pageParam === 1) {
          return Promise.resolve(
            page([status('s1', 'Available')], {
              page: 1,
              hasNextPage: true,
              totalPages: 2,
            }),
          );
        }
        return Promise.resolve(
          page([status('s2', 'Busy')], { page: 2, hasNextPage: false }),
        );
      });

      renderScreen();

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );

      // Trigger the observer -> onFetchNextPage -> void fetchNextPage().
      // Poll until the up-to-date observer (with hasNextPage=true) is wired up.
      await waitFor(async () => {
        await act(async () => {
          observerCallbacks.forEach((cb) =>
            cb([{ isIntersecting: true } as IntersectionObserverEntry]),
          );
          await Promise.resolve();
        });
        expect(mockedApi).toHaveBeenCalledWith(
          '/statuses',
          expect.objectContaining({
            params: expect.objectContaining({ page: 2 }),
          }),
        );
      });

      await waitFor(() => expect(screen.getByText('Busy')).toBeInTheDocument());
    });
  });

  describe('ref null-guards', () => {
    it('skips the auto-animate setup when the error container ref is null', async () => {
      // 1st useRef -> commentRef (real), 2nd useRef -> errorParent (null).
      useRefMock.mockReturnValueOnce(undefined).mockReturnValueOnce(nullRef());
      setCustomerData(customerWithStatus());

      renderScreen();

      // Component still renders fine even though the auto-animate effect bailed.
      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
    });
  });

  describe('cancel', () => {
    it('calls onCancel when the Cancel button is clicked', async () => {
      setCustomerData(customerWithStatus());
      const onCancel = vi.fn();
      renderScreen({ onCancel });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      fireEvent.click(cancelButton());
      expect(onCancel).toHaveBeenCalledOnce();
    });

    it('disables Cancel while a save is in flight', async () => {
      setCustomerData(customerWithStatus());
      let resolveSave: () => void = () => {};
      const onSave = vi.fn(
        () =>
          new Promise<void>((res) => {
            resolveSave = res;
          }),
      );
      renderScreen({ onSave });

      await waitFor(() =>
        expect(screen.getByText('Available')).toBeInTheDocument(),
      );
      await waitFor(() => expect(saveButton()).not.toBeDisabled());

      await act(() => {
        fireEvent.click(saveButton());
      });

      // Submission is pending -> Cancel disabled.
      expect(cancelButton()).toBeDisabled();

      await act(() => {
        resolveSave();
      });

      await waitFor(() => expect(cancelButton()).not.toBeDisabled());
    });
  });
});
