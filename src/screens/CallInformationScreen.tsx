import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { getCountryData } from 'countries-list';

import {
  ArrowDropDownIcon,
  CallEndOutlinedIcon,
  EditOutlinedIcon,
  MicIcon,
  MicOffIcon,
} from '../assets/icons';
import CallNotification from '../components/CallNotification';
import Flag from '../components/Flag';
import {
  setIsCollapsed,
  setMicMuted,
  setNotification,
  setScreen,
  widgetState,
} from '../stores/widgetStore';
import type { CustomerData } from '../types/types';
import { Button, Chip, Divider, IconButton } from '../ui';
import { callStatus, muteNotification, useLocalTime } from '../utils';

interface CallInformationScreenProps {
  customer: CustomerData;
  onEndCall: () => void;
}

const CallInformationScreen = ({
  customer,
  onEndCall,
}: CallInformationScreenProps) => {
  const { isMicMuted, notification } = widgetState;
  const { label: callStatusLabel, duration: callDuration } = callStatus;
  const [notifParent] = useAutoAnimate<HTMLDivElement>();

  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;
  const countryName = getCountryData(customer.country).name;

  const handleGoToProfile = () => {
    const webUrl = widgetState.config?.webBaseUrl ?? '';
    window.open(`${webUrl}/customers/${customer.id}`, '_blank', 'noopener');
  };

  return (
    <div class='cw-screen-call-info'>
      <div class='cw-screen-call-info__header'>
        <h6 class='cw-text-h6 cw-screen-call-info__title'>Call Information</h6>
        <IconButton
          size='small'
          onClick={() => setIsCollapsed(true)}
          style={{ color: 'var(--cw-text-secondary)' }}
        >
          <ArrowDropDownIcon />
        </IconButton>
      </div>

      <div class='cw-screen-call-info__body'>
        <div ref={notifParent} class='cw-screen-call-info__notifs'>
          {muteNotification.visible && (
            <CallNotification
              type='info'
              message='The microphone is muted.'
              countdown={muteNotification.countdown}
            />
          )}
          {notification && (
            <CallNotification
              type='error'
              message={notification}
              onClose={() => setNotification(null)}
            />
          )}
        </div>

        <div class='cw-screen-call-info__main'>
          <div class='cw-screen-call-info__row cw-screen-call-info__row--country'>
            <div class='cw-flex-row-center cw-screen-call-info__country'>
              <Flag country={customer.country} title={customer.country} />
              <span class='cw-text-body3 cw-text-secondary'>
                {customer.country}
                {countryName ? ` / ${countryName}` : ''}
              </span>
            </div>
            <span class='cw-text-body3 cw-text-secondary'>
              Local time: {localTime}
            </span>
          </div>

          <div class='cw-screen-call-info__row'>
            <span class='cw-text-body3 cw-text-secondary cw-screen-call-info__label'>
              Customer
            </span>
            <span class='cw-text-body3 cw-truncate'>{customerName}</span>
          </div>

          <Button
            variant='outlined'
            fullWidth
            onClick={handleGoToProfile}
            style={{ height: 32 }}
          >
            Go to profile in Calleague
          </Button>

          <Divider />

          <div class='cw-screen-call-info__row'>
            <span class='cw-text-body3 cw-text-secondary cw-screen-call-info__label'>
              Brand
            </span>
            <span class='cw-text-body3 cw-truncate'>
              {customer.brandName || '-'}
            </span>
          </div>

          <div class='cw-screen-call-info__row cw-screen-call-info__row--status'>
            <span class='cw-text-body3 cw-text-secondary cw-screen-call-info__label'>
              Dialer Status:
            </span>
            <div class='cw-screen-call-info__status'>
              {customer.status ? (
                <Chip
                  label={customer.status.name}
                  color={customer.status.color}
                />
              ) : (
                <span class='cw-text-body3'>N/A</span>
              )}
              <IconButton
                size='small'
                onClick={() => setScreen('changeStatus')}
              >
                <EditOutlinedIcon size={18} />
              </IconButton>
            </div>
          </div>

          <div class='cw-screen-call-info__call-status'>
            <span class='cw-text-body3 cw-text-secondary'>
              {callStatusLabel}
            </span>
            {callDuration && <span class='cw-text-body3'>{callDuration}</span>}
          </div>

          <div class='cw-screen-call-info__actions'>
            <Button
              onClick={() => setMicMuted(!isMicMuted)}
              startIcon={isMicMuted ? <MicOffIcon /> : <MicIcon />}
              style={{ minWidth: 118 }}
            >
              {isMicMuted ? 'Unmute' : 'Mute'}
            </Button>

            <Button
              variant='outlined'
              tone='danger'
              onClick={onEndCall}
              startIcon={<CallEndOutlinedIcon />}
            >
              End call
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CallInformationScreen;
