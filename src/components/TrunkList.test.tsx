import { fireEvent, render, screen } from '@testing-library/preact';

vi.mock('@formkit/auto-animate/preact', () => ({
  useAutoAnimate: () => [{ current: null }],
}));

vi.mock('./NoResultsFound', () => ({
  default: ({ hasAppliedFilters }: { hasAppliedFilters?: boolean }) => (
    <div data-testid='no-results' data-filtered={String(hasAppliedFilters)} />
  ),
}));

import type { TrunkListItem } from '../types/types';

import TrunkList from './TrunkList';

const trunk = (id: string, name: string): TrunkListItem => ({
  id,
  name,
  brandId: 'b1',
  isDefault: false,
  status: 'active',
  enabled: true,
  minuteCost: 0,
});

const defaultTrunks = [trunk('t1', 'Main Trunk'), trunk('t2', 'Backup Trunk')];

const baseProps = {
  trunks: defaultTrunks,
  selectedId: null as string | null,
  onSelect: vi.fn(),
  isLoading: false,
  search: '',
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('TrunkList', () => {
  describe('loading state', () => {
    it('shows the loading container and hides trunk names while isLoading', () => {
      render(<TrunkList {...baseProps} isLoading />);
      expect(screen.queryByText('Main Trunk')).not.toBeInTheDocument();
      expect(document.querySelector('.cw-list-state')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('renders NoResultsFound with hasAppliedFilters=false when no trunks and no active search', () => {
      render(<TrunkList {...baseProps} trunks={[]} search='' />);
      const el = screen.getByTestId('no-results');
      expect(el).toBeInTheDocument();
      expect(el).toHaveAttribute('data-filtered', 'false');
    });

    it('renders NoResultsFound with hasAppliedFilters=true when no trunks but search term is present', () => {
      render(<TrunkList {...baseProps} trunks={[]} search='main' />);
      expect(screen.getByTestId('no-results')).toHaveAttribute(
        'data-filtered',
        'true',
      );
    });
  });

  describe('list rendering', () => {
    it('renders all trunk names', () => {
      render(<TrunkList {...baseProps} />);
      expect(screen.getByText('Main Trunk')).toBeInTheDocument();
      expect(screen.getByText('Backup Trunk')).toBeInTheDocument();
    });

    it('marks the selected trunk row with data-selected and leaves others unmarked', () => {
      render(<TrunkList {...baseProps} selectedId='t1' />);
      const rows = document.querySelectorAll('.cw-list-row');
      expect(rows[0]).toHaveAttribute('data-selected');
      expect(rows[1]).not.toHaveAttribute('data-selected');
    });

    it('calls onSelect with the trunk id when a row is clicked', () => {
      const onSelect = vi.fn();
      render(<TrunkList {...baseProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Backup Trunk'));
      expect(onSelect).toHaveBeenCalledWith('t2');
    });

    it('does not call onSelect for a different trunk than the one clicked', () => {
      const onSelect = vi.fn();
      render(<TrunkList {...baseProps} onSelect={onSelect} />);
      fireEvent.click(screen.getByText('Backup Trunk'));
      expect(onSelect).not.toHaveBeenCalledWith('t1');
    });
  });
});
