import NotFoundIcon from '../assets/NotFoundIcon';

interface NoResultsFoundProps {
  hasAppliedFilters?: boolean;
  emptyMessage?: string;
  filterMessage?: string;
}

const DEFAULT_FILTER_MESSAGE = 'No results match the search query';

export const NoResultsFound = ({
  hasAppliedFilters = false,
  emptyMessage,
  filterMessage,
}: NoResultsFoundProps) => {
  const message = hasAppliedFilters
    ? (filterMessage ?? DEFAULT_FILTER_MESSAGE)
    : (emptyMessage ?? DEFAULT_FILTER_MESSAGE);

  return (
    <div class='cw-no-results'>
      <NotFoundIcon />
      <span class='cw-text-body2 cw-text-secondary'>{message}</span>
    </div>
  );
};

export default NoResultsFound;
