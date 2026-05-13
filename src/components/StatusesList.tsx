import { useCallback, useEffect, useRef } from 'preact/hooks';

import { ERR_GENERIC } from '../errors';
import type { StatusOption } from '../types/types';
import { Chip, Radio, RadioGroup, Spinner } from '../ui';

import NoResultsFound from './NoResultsFound';

interface StatusesListProps {
  statuses: StatusOption[];
  selectedStatusId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  isLoading: boolean;
  isError: boolean;
  isFetchingNextPage: boolean;
  hasNextPage: boolean;
  onFetchNextPage: () => void;
}

const StatusesList = ({
  statuses,
  selectedStatusId,
  onSelect,
  searchQuery,
  isLoading,
  isError,
  isFetchingNextPage,
  hasNextPage,
  onFetchNextPage,
}: StatusesListProps) => {
  const loadMoreRef = useRef<HTMLDivElement>(null);

  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      const [entry] = entries;
      if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
        onFetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, onFetchNextPage],
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(handleObserver, {
      root: null,
      rootMargin: '100px',
      threshold: 0,
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, [handleObserver]);

  if (isLoading) {
    return (
      <div class='cw-list-state'>
        <Spinner size={24} />
      </div>
    );
  }

  if (isError) {
    return (
      <div class='cw-list-state'>
        <span class='cw-text-body3' style={{ color: 'var(--cw-error-fg)' }}>
          {ERR_GENERIC}
        </span>
      </div>
    );
  }

  if (statuses.length === 0) {
    return <NoResultsFound hasAppliedFilters={!!searchQuery} />;
  }

  return (
    <>
      <RadioGroup value={selectedStatusId} onChange={onSelect}>
        {statuses.map((status) => (
          <div
            key={status.id}
            class='cw-list-row'
            data-selected={selectedStatusId === status.id ? '' : undefined}
            onClick={() => onSelect(status.id)}
          >
            <Radio
              name='cw-status'
              value={status.id}
              checked={selectedStatusId === status.id}
            />
            <Chip label={status.name} color={status.color} />
          </div>
        ))}
      </RadioGroup>
      <div ref={loadMoreRef}>
        {isFetchingNextPage && (
          <div class='cw-list-state' style={{ padding: '16px 0' }}>
            <Spinner size={20} />
          </div>
        )}
      </div>
    </>
  );
};

export default StatusesList;
