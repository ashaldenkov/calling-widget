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
};

beforeEach(() => {
  vi.clearAllMocks();
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

    it('renders NoResultsFound with hasAppliedFilters=false when empty and no search', () => {
      render(<StatusesList {...baseProps} statuses={[]} searchQuery='' />);
      expect(screen.getByTestId('no-results')).toHaveAttribute(
        'data-filtered',
        'false',
      );
    });

    it('renders NoResultsFound with hasAppliedFilters=true when empty but searching', () => {
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

    it('renders only the statuses it is given (parent filters the list)', () => {
      render(<StatusesList {...baseProps} statuses={[status('s2', 'Busy')]} />);
      expect(screen.queryByText('Available')).not.toBeInTheDocument();
      expect(screen.getByText('Busy')).toBeInTheDocument();
    });
  });
});
