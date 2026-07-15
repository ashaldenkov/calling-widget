import { useState, useEffect } from 'preact/hooks';

import ConfirmationDialog from '../components/ConfirmationDialog';
import SearchField from '../components/SearchField';
import TrunkList from '../components/TrunkList';
import {
  ERR_GENERIC,
  ERR_MIC_DISCONNECTED,
  ERR_MIC_PERMISSION,
  ERR_NO_TRUNKS,
  getErrorMessage,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import { setSelectedTrunkId, widgetState } from '../stores/widgetStore';
import { Button } from '../ui';
import { handleWidgetError } from '../utils';
import {
  type MicPermissionState,
  probeMicPermission,
} from '../utils/micPermission';

interface SipTrunkScreenProps {
  onConfirm: (trunkId: string) => Promise<void>;
  onCancel: () => void;
}

const micErrorMessage = (state: MicPermissionState): string | null => {
  switch (state) {
    case 'granted':
      return null;
    case 'denied':
      return ERR_MIC_PERMISSION;
    case 'noDevice':
    case 'failed':
      return ERR_MIC_DISCONNECTED;
  }
};

const SipTrunkScreen = ({ onConfirm, onCancel }: SipTrunkScreenProps) => {
  const { trunks, selectedTrunkId } = widgetState;

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedTrunkId,
  );
  const [search, setSearch] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  // Trunks + customer are supplied by the host via the `call` event (backendless).
  useEffect(() => {
    if (trunks.length === 0) {
      handleWidgetError(ERR_NO_TRUNKS);
      return;
    }
    if (!widgetState.selectedTrunkId) {
      const preferred = trunks.find((t) => t.isDefault) ?? trunks[0];
      setLocalSelectedId(preferred.id);
    }
  }, [trunks]);

  const filteredTrunks = trunks.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase()),
  );
  const isSelectedVisible = filteredTrunks.some(
    (t) => t.id === localSelectedId,
  );

  const handleCallConfirm = async () => {
    if (!localSelectedId) return;
    setIsStarting(true);
    setCallError(null);
    try {
      const micError = micErrorMessage(await probeMicPermission());
      if (micError) {
        setCallError(micError);
        return;
      }
      setSelectedTrunkId(localSelectedId);
      const selectedTrunk = trunks.find((t) => t.id === localSelectedId);
      eventBus.emit(WidgetEvent.TrunkSelected, {
        trunkId: localSelectedId,
        trunkName: selectedTrunk?.name ?? '',
      });
      await onConfirm(localSelectedId);
    } catch (err) {
      setCallError(getErrorMessage(err, ERR_GENERIC));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <div class='cw-screen-sip-trunk'>
      <h6 class='cw-text-h6 cw-screen-title'>SIP Trunk</h6>

      <div class='cw-screen-body'>
        <SearchField onChange={setSearch} debounceMs={0} />

        <div class='cw-screen-list cw-scroll'>
          <TrunkList
            trunks={filteredTrunks}
            selectedId={localSelectedId}
            onSelect={setLocalSelectedId}
            isLoading={false}
            search={search}
          />
        </div>

        <div class='cw-screen-actions'>
          <Button tone='secondary' onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!localSelectedId || !isSelectedVisible}
          >
            Confirm
          </Button>
        </div>
      </div>

      <ConfirmationDialog
        open={showConfirmation}
        title='Start a call'
        message='Are you sure you want to start a call with this client?'
        onCancel={() => {
          if (isStarting) return;
          setShowConfirmation(false);
          setCallError(null);
        }}
        onConfirm={() => void handleCallConfirm()}
        loading={isStarting}
        error={callError}
        onErrorClose={() => setCallError(null)}
      />
    </div>
  );
};

export default SipTrunkScreen;
