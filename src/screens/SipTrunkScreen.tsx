import CloseIcon from '@mui/icons-material/Close';
import SearchIcon from '@mui/icons-material/Search';
import {
  Box,
  Button,
  Collapse,
  IconButton,
  InputAdornment,
  TextField,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/preact-query';
import { useState, useEffect } from 'preact/hooks';

import { api } from '../api/api';
import CallNotification from '../components/CallNotification';
import ConfirmationDialog from '../components/ConfirmationDialog';
import TrunkList from '../components/TrunkList';
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
import { colors } from '../theme/colors';
import {
  dialogTitlePadding,
  formButtonPrimary,
  formButtonSecondary,
} from '../theme/styles';
import type { TrunkResponse } from '../types/types';
import { getErrorMessage, handleWidgetError } from '../utils';

interface SipTrunkScreenProps {
  onConfirm: (trunkId: string) => Promise<void>;
  onCancel: () => void;
}

const SipTrunkScreen = ({ onConfirm, onCancel }: SipTrunkScreenProps) => {
  const { agentId, apiKey, clientId, phoneNumber, selectedTrunkId } =
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
      agentId,
      clientId,
      phoneNumber,
    ],
    queryFn: () =>
      api<TrunkResponse>('/widget/trunks-for-call', {
        method: 'POST',
        data: {
          apiKey,
          extAgentId: agentId,
          extCustomerId: clientId ?? undefined,
          phoneNumber: phoneNumber ?? undefined,
          search: '',
        },
      }),
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

  const handleCallConfirm = async () => {
    if (!localSelectedId) return;
    setIsStarting(true);
    setCallError(null);
    try {
      const { data: inCallData } = await checkInCall();
      if (inCallData?.inCall) {
        setShowConfirmation(false);
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
      setShowConfirmation(false);
      setCallError(getErrorMessage(err, ERR_CALL_START));
    } finally {
      setIsStarting(false);
    }
  };

  return (
    <Box>
      <Typography variant='h6' sx={dialogTitlePadding}>
        SIP Trunk
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
        <Collapse in={!!callError} timeout={300} unmountOnExit>
          <CallNotification
            type='error'
            message={callError ?? ''}
            onClose={() => setCallError(null)}
          />
        </Collapse>

        <TextField
          size='small'
          fullWidth
          placeholder='Search'
          value={search}
          onChange={(e) => setSearch(e.currentTarget.value)}
          slotProps={{
            input: {
              startAdornment: (
                <SearchIcon
                  fontSize='small'
                  sx={{ mr: 1, color: 'text.secondary' }}
                />
              ),
              endAdornment: search ? (
                <InputAdornment position='end'>
                  <IconButton
                    size='small'
                    onClick={() => setSearch('')}
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
            height: 240,
            overflow: 'auto',
          }}
        >
          <TrunkList
            trunks={filteredTrunks}
            selectedId={localSelectedId}
            onSelect={setLocalSelectedId}
            isLoading={isPending}
            search={search}
          />
        </Box>

        <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
          <Button onClick={onCancel} sx={formButtonSecondary}>
            Cancel
          </Button>
          <Button
            onClick={() => setShowConfirmation(true)}
            disabled={!localSelectedId || isPending}
            sx={formButtonPrimary}
          >
            Confirm
          </Button>
        </Box>
      </Box>

      <ConfirmationDialog
        open={showConfirmation}
        title='Start a call'
        message='Are you sure you want to start a call with this client?'
        onCancel={() => !isStarting && setShowConfirmation(false)}
        onConfirm={() => void handleCallConfirm()}
        loading={isStarting}
      />
    </Box>
  );
};

export default SipTrunkScreen;
