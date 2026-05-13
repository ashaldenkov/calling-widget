import autoAnimate from '@formkit/auto-animate';
import { useInfiniteQuery } from '@tanstack/preact-query';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { api } from '../api/api';
import { CancelIcon, InfoOutlinedIcon, SearchIcon } from '../assets/icons';
import CallNotification from '../components/CallNotification';
import StatusesList from '../components/StatusesList';
import { ERR_STATUS_SAVE } from '../errors';
import { widgetState } from '../stores/widgetStore';
import type { StatusOption, StatusesResponse } from '../types/types';
import { Button, IconButton, TextField, Tooltip } from '../ui';
import { getErrorMessage } from '../utils';

interface ChangeStatusScreenProps {
  onSave: (statusId: string, comment: string) => Promise<void>;
  onCancel: () => void;
}

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
  const errorParent = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!errorParent.current) return;
    const ctrl = autoAnimate(errorParent.current);
    return () => ctrl.destroy?.();
  }, []);

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
    <div class='cw-screen-change-status'>
      <h6 class='cw-text-h6 cw-screen-title'>Change status</h6>

      <div class='cw-screen-body'>
        <div ref={errorParent} class='cw-screen-change-status__notifs'>
          {saveError && (
            <CallNotification
              type='error'
              message={saveError}
              onClose={() => setSaveError(null)}
            />
          )}
        </div>

        <div class='cw-screen-change-status__main'>
          <TextField
            fullWidth
            placeholder='Search'
            value={searchQuery}
            onInput={(e) => setSearchQuery(e.currentTarget.value)}
            startAdornment={<SearchIcon size={18} />}
            endAdornment={
              searchQuery ? (
                <IconButton
                  size='small'
                  onClick={() => setSearchQuery('')}
                  style={{ color: 'var(--cw-text-tertiary)' }}
                >
                  <CancelIcon size={24} />
                </IconButton>
              ) : null
            }
          />

          <div class='cw-screen-list cw-scroll cw-screen-change-status__list'>
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
          </div>

          <div class='cw-screen-change-status__comment'>
            <TextField
              label='Comment'
              placeholder='Type your comment'
              value={comment}
              onInput={(e) => setComment(e.currentTarget.value)}
              error={isCommentTooLong}
              helperText={isCommentTooLong ? 'Too long' : undefined}
              multiline
              minRows={1}
              maxRows={4}
              fullWidth
            />
            <span class='cw-screen-change-status__hint'>
              <Tooltip title={`${MAX_COMMENT_LENGTH} length max`}>
                <InfoOutlinedIcon size={20} />
              </Tooltip>
            </span>
          </div>

          <div class='cw-screen-actions'>
            <Button tone='secondary' onClick={onCancel} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button
              onClick={() => void handleSave()}
              disabled={isSubmitDisabled || isSubmitting}
            >
              Save
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ChangeStatusScreen;
