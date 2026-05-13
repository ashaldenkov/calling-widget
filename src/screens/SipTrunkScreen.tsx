import { useQuery } from '@tanstack/preact-query';
import { useState, useEffect } from 'preact/hooks';

import { api } from '../api/api';
import ConfirmationDialog from '../components/ConfirmationDialog';
import SearchField from '../components/SearchField';
import TrunkList from '../components/TrunkList';
import { encryptPhoneNumber } from '../crypto/phoneEncryption';
import {
  ERR_CALL_START,
  ERR_CUSTOMER_IN_CALL,
  ERR_NO_TRUNKS,
  ERR_TRUNK_FETCH,
} from '../errors';
import { eventBus, WidgetEvent } from '../eventBus';
import {
  setCustomerData,
  setSelectedTrunkId,
  widgetState,
} from '../stores/widgetStore';
import type { TrunkResponse } from '../types/types';
import { Button } from '../ui';
import { getErrorMessage, handleWidgetError } from '../utils';

interface SipTrunkScreenProps {
  onConfirm: (trunkId: string) => Promise<void>;
  onCancel: () => void;
}

const SipTrunkScreen = ({ onConfirm, onCancel }: SipTrunkScreenProps) => {
  const { extAgentId, apiKey, extCustomerId, phoneNumber, selectedTrunkId } =
    widgetState;

  const [localSelectedId, setLocalSelectedId] = useState<string | null>(
    selectedTrunkId,
  );
  const [search, setSearch] = useState('');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [callError, setCallError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const { data, isPending, isError, error } = useQuery({
    queryKey: [
      'widget',
      'trunks-for-call',
      apiKey,
      extAgentId,
      extCustomerId,
      phoneNumber,
    ],
    queryFn: async () => {
      const phoneNumberEnc = phoneNumber
        ? await encryptPhoneNumber(phoneNumber)
        : undefined;
      return api<TrunkResponse>('/widget/trunks-for-call', {
        method: 'POST',
        data: {
          apiKey,
          extAgentId,
          extCustomerId,
          phoneNumberEnc,
          search: '',
        },
      });
    },
  });

  const dialerId = data?.customerInfo.dialerId;

  const { refetch: checkInCall } = useQuery<{ inCall: boolean }>({
    queryKey: [`/customers/${dialerId}/in-call`],
    enabled: false,
    staleTime: 0,
    gcTime: 0,
  });

  useEffect(() => {
    if (data === undefined) return;
    if (data.trunks.length === 0) {
      handleWidgetError(ERR_NO_TRUNKS);
      return;
    }
    setCustomerData(data.customerInfo);
    if (!widgetState.selectedTrunkId) {
      setLocalSelectedId(data.trunks[0].id);
    }
  }, [data]);

  useEffect(() => {
    if (isError) handleWidgetError(ERR_TRUNK_FETCH, error);
  }, [isError, error]);

  const trunks = data?.trunks ?? [];
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
      const inCallResult = await checkInCall();
      if (inCallResult.isError) throw inCallResult.error;
      if (inCallResult.data?.inCall) {
        setCallError(ERR_CUSTOMER_IN_CALL);
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
      setCallError(getErrorMessage(err, ERR_CALL_START));
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
            isLoading={isPending}
            search={search}
          />
        </div>

        <div class='cw-screen-actions'>
          <Button tone='secondary' onClick={onCancel}>
            Cancel
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!localSelectedId || !isSelectedVisible || isPending}
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
