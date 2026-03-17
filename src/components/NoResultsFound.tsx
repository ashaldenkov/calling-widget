import { Box, Typography } from '@mui/material';

import NotFoundIcon from '../assets/NotFoundIcon';
import { flexCenter } from '../theme/styles';

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
    <Box
      sx={{
        ...flexCenter,
        flexDirection: 'column',
        height: '100%',
        margin: '0 auto',
        textAlign: 'center',
        color: 'text.secondary',
        gap: 2,
      }}
    >
      <NotFoundIcon sx={{ width: 124, height: 124 }} />
      <Typography variant='body2'>{message}</Typography>
    </Box>
  );
};

export default NoResultsFound;
