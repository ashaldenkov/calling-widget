import autoAnimate from '@formkit/auto-animate';
import { useQuery } from '@tanstack/preact-query';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';

import { InfoOutlinedIcon } from '../assets/icons';
import CallNotification from '../components/CallNotification';
import CommentField, {
  type CommentFieldHandle,
} from '../components/CommentField';
import SearchField from '../components/SearchField';
import StatusesList from '../components/StatusesList';
import { loadStatuses } from '../demo-data/statuses';
import { ERR_GENERIC, getErrorMessage } from '../errors';
import { widgetState } from '../stores/widgetStore';
import type { StatusOption } from '../types/types';
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

  // Local demo: load the full list once, then filter client-side (no debounce,
  // no pagination) — the list animates on filter like the trunk list.
  const { data, isLoading, isError } = useQuery<StatusOption[]>({
    queryKey: ['statuses'],
    queryFn: () => loadStatuses(widgetState.statuses),
    staleTime: Infinity,
  });

  const allStatuses = useMemo<StatusOption[]>(() => {
    const all = data ?? [];
    const term = searchQuery.trim().toLowerCase();
    const filtered = term
      ? all.filter((s) => s.name.toLowerCase().includes(term))
      : all;
    if (currentStatus && !term) {
      const rest = filtered.filter((s) => s.id !== currentStatus.id);
      return [currentStatus, ...rest];
    }
    return filtered;
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
          <SearchField onChange={setSearchQuery} debounceMs={0} />

          <div class='cw-screen-list cw-scroll cw-screen-change-status__list'>
            <StatusesList
              statuses={allStatuses}
              selectedStatusId={selectedStatusId}
              onSelect={setSelectedStatusId}
              searchQuery={searchQuery}
              isLoading={isLoading}
              isError={isError}
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
