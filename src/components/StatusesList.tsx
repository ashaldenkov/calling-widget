import {
  Box,
  Chip,
  CircularProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useRef } from 'react';

import { ERR_GENERIC } from '../errors';
import { colors } from '../theme/colors';
import { flexCenter, listRowSx } from '../theme/styles';
import type { StatusOption } from '../types/types';

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

const statusChipSx = {
  fontWeight: 400,
  fontSize: 14,
  height: 28,
  color: 'text.primary',
  '& .MuiChip-label': {
    px: 1,
  },
};

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
      <Box sx={{ ...flexCenter, height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (isError) {
    return (
      <Box sx={{ ...flexCenter, height: '100%' }}>
        <Typography variant='body2' color='error'>
          {ERR_GENERIC}
        </Typography>
      </Box>
    );
  }

  if (statuses.length === 0) {
    return <NoResultsFound hasAppliedFilters={!!searchQuery} />;
  }

  return (
    <>
      <RadioGroup
        value={selectedStatusId ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <Stack direction='column'>
          {statuses.map((status) => (
            <Box
              key={status.id}
              onClick={() => onSelect(status.id)}
              sx={{
                ...listRowSx,
                backgroundColor:
                  selectedStatusId === status.id
                    ? 'background.default'
                    : 'transparent',
              }}
            >
              <Radio
                value={status.id}
                checked={selectedStatusId === status.id}
                size='small'
                sx={{
                  p: 0.5,
                  color: colors.gray700,
                  '&.Mui-checked': { color: colors.gray700 },
                }}
              />
              <Chip
                label={status.name}
                size='small'
                sx={{
                  ...statusChipSx,
                  backgroundColor: `${status.color}20`,
                  border: `1px solid ${status.color}`,
                }}
              />
            </Box>
          ))}
        </Stack>
      </RadioGroup>
      <Box ref={loadMoreRef} sx={{ minHeight: 1 }}>
        {isFetchingNextPage && (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
            <CircularProgress size={20} />
          </Box>
        )}
      </Box>
    </>
  );
};

export default StatusesList;
