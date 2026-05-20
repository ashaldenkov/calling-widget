import autoAnimate from '@formkit/auto-animate';
import { useInfiniteQuery } from '@tanstack/preact-query';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { api } from '../api/api';
import { InfoOutlinedIcon } from '../assets/icons';
import CallNotification from '../components/CallNotification';
import CommentField, {
  type CommentFieldHandle,
} from '../components/CommentField';
import SearchField from '../components/SearchField';
import StatusesList from '../components/StatusesList';
import { ERR_GENERIC, getErrorMessage } from '../errors';
import { widgetState } from '../stores/widgetStore';
import type { StatusOption, StatusesResponse } from '../types/types';
import { Button, Tooltip } from '../ui';

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
  const [isCommentInvalid, setIsCommentInvalid] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const commentRef = useRef<CommentFieldHandle>(null);
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
    const pages = data?.pages.flatMap((p) => p.items) ?? [];
    if (currentStatus && !searchQuery) {
      const rest = pages.filter((s) => s.id !== currentStatus.id);
      return [currentStatus, ...rest];
    }
    return pages;
  }, [data, currentStatus, searchQuery]);

  const isSubmitDisabled =
    !selectedStatusId || isLoading || isError || isCommentInvalid;

  const handleSave = async () => {
    if (!selectedStatusId) return;
    setIsSubmitting(true);
    setSaveError(null);
    try {
      const comment = commentRef.current?.getValue() ?? '';
      await onSave(selectedStatusId, comment);
    } catch (err) {
      setSaveError(getErrorMessage(err, ERR_GENERIC));
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
          <SearchField onChange={setSearchQuery} />

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
            <CommentField
              ref={commentRef}
              maxLength={MAX_COMMENT_LENGTH}
              onValidityChange={setIsCommentInvalid}
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
