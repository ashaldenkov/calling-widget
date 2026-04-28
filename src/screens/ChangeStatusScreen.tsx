import CloseIcon from '@mui/icons-material/Close';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useInfiniteQuery } from '@tanstack/preact-query';
import { useMemo, useState } from 'preact/hooks';

import { api } from '../api/api';
import CallNotification from '../components/CallNotification';
import StatusesList from '../components/StatusesList';
import { ERR_STATUS_SAVE } from '../errors';
import { widgetState } from '../stores/widgetStore';
import { colors } from '../theme/colors';
import {
  dialogTitlePadding,
  formButtonPrimary,
  formButtonSecondary,
} from '../theme/styles';
import type { StatusOption, StatusesResponse } from '../types/types';
import { getErrorMessage } from '../utils';

interface ChangeStatusScreenProps {
  onSave: (statusId: string, comment: string) => Promise<void>;
  onCancel: () => void;
}

const commentTextFieldSx = {
  '& .MuiInputLabel-root': {
    color: 'text.secondary',
    fontSize: '0.75rem',
  },
  '& .MuiInputLabel-shrink': {
    transform: 'translate(14px, -6px) scale(1)',
    color: 'text.secondary',
    fontSize: '0.75rem',
  },
  '& .MuiOutlinedInput-root': {
    padding: '8px 14px',
    paddingRight: '32px',
  },
  '& .MuiInputBase-inputMultiline': {
    padding: 0,
  },
};

const MAX_COMMENT_LENGTH = 500;

const ChangeStatusScreen = ({ onSave, onCancel }: ChangeStatusScreenProps) => {
  const { customerData } = widgetState;

  const currentStatus = customerData?.status ?? null;

  const [selectedStatusId, setSelectedStatusId] = useState<string | null>(
    currentStatus?.id ?? null,
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [comment, setComment] = useState('');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data,
    isLoading,
    isError,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = useInfiniteQuery<StatusesResponse>({
    queryKey: ['/statuses', { perPage: 25, search: searchQuery || undefined }],
    queryFn: async ({ pageParam, signal }) =>
      api<StatusesResponse>('/statuses', {
        params: {
          page: pageParam ?? 1,
          perPage: 25,
          ...(searchQuery ? { search: searchQuery } : {}),
        },
        signal,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) =>
      lastPage.pageInfo.hasNextPage ? lastPage.pageInfo.page + 1 : undefined,
  });

  const allStatuses = useMemo<StatusOption[]>(() => {
    const pages = data?.pages.flatMap((p) => p.data) ?? [];
    if (currentStatus && !searchQuery) {
      const rest = pages.filter((s) => s.id !== currentStatus.id);
      return [currentStatus, ...rest];
    }
    return pages;
  }, [data, currentStatus, searchQuery]);

  const isCommentTooLong = comment.length > MAX_COMMENT_LENGTH;
  const isSubmitDisabled =
    !selectedStatusId || isLoading || isError || isCommentTooLong;

  const handleSave = async () => {
    if (!selectedStatusId) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      await onSave(selectedStatusId, comment);
    } catch (err) {
      setSaveError(getErrorMessage(err, ERR_STATUS_SAVE));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography variant='h6' sx={dialogTitlePadding}>
        Change status
      </Typography>

      <Box
        sx={{
          px: '24px',
          pb: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Collapse in={!!saveError} timeout={300} unmountOnExit>
          <CallNotification
            type='error'
            message={saveError ?? ''}
            onClose={() => setSaveError(null)}
          />
        </Collapse>

        <TextField
          size='small'
          fullWidth
          placeholder='Search'
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.currentTarget.value)}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize='small'
                  sx={{ mr: 1, color: 'text.secondary' }}
                />
              ),
              endAdornment: searchQuery ? (
                <InputAdornment position='end'>
                  <IconButton
                    size='small'
                    onClick={() => setSearchQuery('')}
                    edge='end'
                    sx={{ p: 0.5 }}
                  >
                    <CloseIcon fontSize='small' />
                  </IconButton>
                </InputAdornment>
              ) : null,
            },
          }}
        />

        <Box
          sx={{
            border: '1px solid',
            borderColor: colors.gray800_12,
            borderRadius: 1,
            height: 192,
            overflow: 'auto',
          }}
        >
          <StatusesList
            statuses={allStatuses}
            selectedStatusId={selectedStatusId}
            onSelect={setSelectedStatusId}
            searchQuery={searchQuery}
            isLoading={isLoading}
            isError={isError}
            isFetchingNextPage={isFetchingNextPage}
            hasNextPage={hasNextPage}
            onFetchNextPage={() => void fetchNextPage()}
          />
        </Box>

        <Box sx={{ position: 'relative' }}>
          <TextField
            label='Comment'
            placeholder='Type your comment'
            value={comment}
            onChange={(e) => setComment(e.currentTarget.value)}
            error={isCommentTooLong}
            helperText={isCommentTooLong ? 'Too long ' : undefined}
            multiline
            minRows={1}
            maxRows={4}
            size='small'
            fullWidth
            sx={commentTextFieldSx}
            slotProps={{ inputLabel: { shrink: true } }}
          />
          <Tooltip title={`${MAX_COMMENT_LENGTH} length max`}>
            <InfoOutlinedIcon
              sx={{
                position: 'absolute',
                top: 10,
                right: 10,
                color: 'text.secondary',
                fontSize: 20,
              }}
            />
          </Tooltip>
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button
            onClick={onCancel}
            sx={formButtonSecondary}
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            onClick={() => void handleSave()}
            disabled={isSubmitDisabled || isSubmitting}
            sx={formButtonPrimary}
          >
            Save
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default ChangeStatusScreen;
