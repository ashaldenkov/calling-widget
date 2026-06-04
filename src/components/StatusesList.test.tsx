import { fireEvent, render, screen } from '@testing-library/preact';

vi.mock('./NoResultsFound', () => ({
  default: ({ hasAppliedFilters }: { hasAppliedFilters?: boolean }) => (
    <div data-testid='no-results' data-filtered={String(hasAppliedFilters)} />
  ),
}));

import { ERR_GENERIC } from '../errors';
import type { StatusOption } from '../types/types';

import StatusesList from './StatusesList';

type Props = Parameters<typeof StatusesList>[0];

const status = (id: string, name: string): StatusOption => ({
  id,
  name,
  color: '#aabbcc',
});

const defaultStatuses = [status('s1', 'Available'), status('s2', 'Busy')];

const baseProps: Props = {
  statuses: defaultStatuses,
  selectedStatusId: null,
  onSelect: vi.fn(),
  searchQuery: '',
  isLoading: false,
  isError: false,
  isFetchingNextPage: false,
  hasNextPage: false,
  onFetchNextPage: vi.fn(),
};

let triggerObserver: (isIntersecting: boolean) => void;

beforeEach(() => {
  vi.clearAllMocks();
  // Arrow functions cannot be constructors — use a class so `new IntersectionObserver(cb)` works
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(cb: IntersectionObserverCallback) {
        triggerObserver = (isIntersecting: boolean) =>
          cb(
            [{ isIntersecting } as IntersectionObserverEntry],
            {} as IntersectionObserver,
          );
      }
      observe = vi.fn();
      disconnect = vi.fn();
    },
  );
});

describe('StatusesList', () => {
  describe('loading / error / empty states', () => {
    it('shows a spinner and hides status names while loading', () => {
      render(<StatusesList {...baseProps} isLoading />);
      expect(screen.queryByText('Available')).not.toBeInTheDocument();
      expect(document.querySelector('.cw-list-state')).toBeInTheDocument();
    });

    it('shows the generic error message when the fetch failed', () => {
      render(<StatusesList {...baseProps} statuses={[]} isError />);
      expect(screen.getByText(ERR_GENERIC)).toBeInTheDocument();
    });

    it('renders NoResultsFound with hasAppliedFilters=false when list is empty and no search query', () => {
      render(<StatusesList {...baseProps} statuses={[]} searchQuery='' />);
      expect(screen.getByTestId('no-results')).toHaveAttribute(
        'data-filtered',
        'false',
      );
    });

    it('renders NoResultsFound with hasAppliedFilters=true when list is empty but search is active', () => {
      render(<StatusesList {...baseProps} statuses={[]} searchQuery='agent' />);
      expect(screen.getByTestId('no-results')).toHaveAttribute(
        'data-filtered',
        'true',
      );
    });
  });

  describe('list rendering and selection', () => {
    it('renders all status names', () => {
      render(<StatusesList {...baseProps} />);
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(screen.getByText('Busy')).toBeInTheDocument();
    });

    it('marks the selected status row with data-selected and leaves others unmarked', () => {
      render(<StatusesList {...baseProps} selectedStatusId='s1' />);
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).toHaveAttribute('data-selected');
      expect(rows[1]).not.toHaveAttribute('data-selected');
    });

    it('calls onSelect with the status id when a row is clicked', () => {
      const onSelect = vi.fn();
      render(<StatusesList {...baseProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Busy'));
      expect(onSelect).toHaveBeenCalledWith('s2');
    });
  });

  describe('infinite scroll via IntersectionObserver', () => {
    it('calls onFetchNextPage when the sentinel enters the viewport and hasNextPage is true', () => {
      const onFetchNextPage = vi.fn();
      render(
        <StatusesList
          {...baseProps}
          hasNextPage
          onFetchNextPage={onFetchNextPage}
        />,
      );
      triggerObserver(true);
      expect(onFetchNextPage).toHaveBeenCalledOnce();
    });

    it('does NOT call onFetchNextPage when hasNextPage is false', () => {
      const onFetchNextPage = vi.fn();
      render(
        <StatusesList
          {...baseProps}
          hasNextPage={false}
          onFetchNextPage={onFetchNextPage}
        />,
      );
      triggerObserver(true);
      expect(onFetchNextPage).not.toHaveBeenCalled();
    });

    it('does NOT call onFetchNextPage while a page fetch is already in progress', () => {
      const onFetchNextPage = vi.fn();
      render(
        <StatusesList
          {...baseProps}
          hasNextPage
          isFetchingNextPage
          onFetchNextPage={onFetchNextPage}
        />,
      );
      triggerObserver(true);
      expect(onFetchNextPage).not.toHaveBeenCalled();
    });

    it('shows a bottom spinner while fetching the next page without hiding the existing list', () => {
      render(<StatusesList {...baseProps} isFetchingNextPage />);
      expect(screen.getByText('Available')).toBeInTheDocument();
      expect(
        document.querySelectorAll('.cw-list-state').length,
      ).toBeGreaterThan(0);
    });
  });
});
