import {
  Box,
  CircularProgress,
  Radio,
  RadioGroup,
  Stack,
  Typography,
} from '@mui/material';

import { colors } from '../theme/colors';
import { flexCenter, listRowSx } from '../theme/styles';
import type { TrunkListItem } from '../types/types';

import NoResultsFound from './NoResultsFound';

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
      <Box sx={{ ...flexCenter, height: '100%' }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (trunks.length === 0) {
    return <NoResultsFound hasAppliedFilters={!!search} />;
  }

  return (
    <RadioGroup
      value={selectedId ?? ''}
      onChange={(e) => onSelect(e.currentTarget.value)}
    >
      <Stack direction='column'>
        {trunks.map((trunk) => (
          <Box
            key={trunk.id}
            onClick={() => onSelect(trunk.id)}
            sx={{
              ...listRowSx,
              backgroundColor:
                selectedId === trunk.id ? 'background.default' : 'transparent',
            }}
          >
            <Radio
              value={trunk.id}
              checked={selectedId === trunk.id}
              size='small'
              sx={{
                p: 0.5,
                color: colors.gray700,
                '&.Mui-checked': { color: colors.gray700 },
              }}
            />
            <Typography variant='body2'>{trunk.name}</Typography>
          </Box>
        ))}
      </Stack>
    </RadioGroup>
  );
};

export default TrunkList;
