import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { memo } from 'preact/compat';

import type { TrunkListItem } from '../types/types';
import { Radio, RadioGroup, Spinner } from '../ui';

import NoResultsFound from './NoResultsFound';

interface TrunkRowProps {
  trunk: TrunkListItem;
  isSelected: boolean;
  onSelect: (id: string) => void;
}

const TrunkRow = memo(({ trunk, isSelected, onSelect }: TrunkRowProps) => (
  <div
    class='cw-list-row'
    data-selected={isSelected ? '' : undefined}
    onClick={() => onSelect(trunk.id)}
  >
    <Radio name='cw-trunk' value={trunk.id} checked={isSelected} />
    <span class='cw-text-body3'>{trunk.name}</span>
  </div>
));

interface TrunkListContentProps {
  trunks: TrunkListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}

const TrunkListContent = ({
  trunks,
  selectedId,
  onSelect,
}: TrunkListContentProps) => {
  const [parent] = useAutoAnimate<HTMLDivElement>();
  return (
    <RadioGroup value={selectedId} onChange={onSelect} parentRef={parent}>
      {trunks.map((trunk) => (
        <TrunkRow
          key={trunk.id}
          trunk={trunk}
          isSelected={selectedId === trunk.id}
          onSelect={onSelect}
        />
      ))}
    </RadioGroup>
  );
};

interface TrunkListProps {
  trunks: TrunkListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  isLoading: boolean;
  search: string;
}

const TrunkList = ({
  trunks,
  selectedId,
  onSelect,
  isLoading,
  search,
}: TrunkListProps) => {
  if (isLoading) {
    return (
      <div class='cw-list-state'>
        <Spinner size={24} />
      </div>
    );
  }

  if (trunks.length === 0) {
    return <NoResultsFound hasAppliedFilters={!!search} />;
  }

  return (
    <TrunkListContent
      trunks={trunks}
      selectedId={selectedId}
      onSelect={onSelect}
    />
  );
};

export default TrunkList;
