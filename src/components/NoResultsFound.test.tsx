import { render, screen } from '@testing-library/preact';

import NoResultsFound from './NoResultsFound';

const DEFAULT_MESSAGE = 'No results match the search query';

describe('NoResultsFound', () => {
  it('renders the empty-state container with the not-found icon', () => {
    const { container } = render(<NoResultsFound />);
    expect(container.querySelector('.cw-no-results')).toBeInTheDocument();
    expect(container.querySelector('svg')).toBeInTheDocument();
  });

  it('shows the default message when no custom copy is provided (no filters)', () => {
    render(<NoResultsFound />);
    expect(screen.getByText(DEFAULT_MESSAGE)).toBeInTheDocument();
  });

  it('shows the empty message branch when hasAppliedFilters is false', () => {
    render(
      <NoResultsFound
        hasAppliedFilters={false}
        emptyMessage='Nothing here yet'
        filterMessage='Nothing matched'
      />,
    );
    expect(screen.getByText('Nothing here yet')).toBeInTheDocument();
    expect(screen.queryByText('Nothing matched')).not.toBeInTheDocument();
  });

  it('shows the filter message branch when hasAppliedFilters is true', () => {
    render(
      <NoResultsFound
        hasAppliedFilters
        emptyMessage='Nothing here yet'
        filterMessage='Nothing matched'
      />,
    );
    expect(screen.getByText('Nothing matched')).toBeInTheDocument();
    expect(screen.queryByText('Nothing here yet')).not.toBeInTheDocument();
  });

  it('falls back to the default message when the relevant custom copy is omitted', () => {
    render(<NoResultsFound hasAppliedFilters />);
    expect(screen.getByText(DEFAULT_MESSAGE)).toBeInTheDocument();
  });
});
