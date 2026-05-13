import { useAutoAnimate } from '@formkit/auto-animate/preact';
import { getCountryData } from 'countries-list';

import {
  ArrowDropUpIcon,
  CallEndOutlinedIcon,
  MicIcon,
  MicOffIcon,
} from '../assets/icons';
import CallNotification from '../components/CallNotification';
import Flag from '../components/Flag';
import {
  setIsCollapsed,
  setMicMuted,
  setNotification,
  widgetState,
} from '../stores/widgetStore';
import type { CustomerData } from '../types/types';
import { Divider, IconButton, Tooltip } from '../ui';
import { callStatus, muteNotification, useLocalTime } from '../utils';

interface CollapsedCallBarProps {
  customer: CustomerData;
  onEndCall: () => void;
}

const CollapsedCallBar = ({ customer, onEndCall }: CollapsedCallBarProps) => {
  const { isMicMuted, notification } = widgetState;
  const { label: callStatusLabel, duration: callDuration } = callStatus;
  const [notifParent] = useAutoAnimate<HTMLDivElement>();

  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;
  const brandName = customer.brandName || '-';
  const countryName = getCountryData(customer.country).name;

  return (
    <div class='cw-bar'>
      <div ref={notifParent} class='cw-bar__notifs'>
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

      <div class='cw-bar__main'>
        <div class='cw-bar__top'>
          <div class='cw-bar__country'>
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

        <div class='cw-bar__bottom'>
          <div class='cw-bar__names'>
            <Tooltip title={customerName}>
              <span class='cw-text-body3 cw-truncate'>{customerName}</span>
            </Tooltip>
            <Tooltip title={brandName}>
              <span class='cw-text-body3 cw-truncate'>{brandName}</span>
            </Tooltip>
          </div>

          <div class='cw-bar__status'>
            {callDuration ? (
              <span class='cw-text-body2'>{callDuration}</span>
            ) : (
              <span class='cw-text-body3 cw-text-secondary'>
                {callStatusLabel}
              </span>
            )}
          </div>

          <div class='cw-bar__actions'>
            <Tooltip title={isMicMuted ? 'Unmute' : 'Mute'}>
              <IconButton
                size='small'
                onClick={() => setMicMuted(!isMicMuted)}
                style={{ color: 'var(--cw-text-secondary)' }}
              >
                {isMicMuted ? <MicOffIcon /> : <MicIcon />}
              </IconButton>
            </Tooltip>
            <Tooltip title='End call'>
              <IconButton
                size='small'
                onClick={onEndCall}
                style={{ color: 'var(--cw-error-fg)' }}
              >
                <CallEndOutlinedIcon />
              </IconButton>
            </Tooltip>
            <Divider orientation='vertical' />
            <IconButton
              size='small'
              onClick={() => setIsCollapsed(false)}
              style={{ color: 'var(--cw-primary)' }}
            >
              <ArrowDropUpIcon />
            </IconButton>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CollapsedCallBar;
