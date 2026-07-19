import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { memo } from 'preact/compat';

import { ERR_GENERIC } from '../errors';
import type { StatusOption } from '../types/types';
import { Chip, Radio, RadioGroup, Spinner } from '../ui';

import NoResultsFound from './NoResultsFound';

interface StatusRowProps {
  status: StatusOption;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const StatusRow = memo(({ status, isSelected, onSelect }: StatusRowProps) => (
  <div
    class='cw-list-row'
    data-selected={isSelected ? '' : undefined}
    onClick={() => onSelect(status.id)}
  >
    <Radio name='cw-status' value={status.id} checked={isSelected} />
    <Chip label={status.name} color={status.color} />
  </div>
));

interface StatusesListProps {
  statuses: StatusOption[];
  selectedStatusId: string | null;
  onSelect: (id: string) => void;
  searchQuery: string;
  isLoading: boolean;
  isError: boolean;
}

const StatusesList = ({
  statuses,
  selectedStatusId,
  onSelect,
  searchQuery,
  isLoading,
  isError,
}: StatusesListProps) => {
  const [parent] = useAutoAnimate<HTMLDivElement>();

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
    <RadioGroup value={selectedStatusId} onChange={onSelect} parentRef={parent}>
      {statuses.map((status) => (
        <StatusRow
          key={status.id}
          status={status}
          isSelected={selectedStatusId === status.id}
          onSelect={onSelect}
        />
      ))}
    </RadioGroup>
  );
};

export default StatusesList;
