import { useSignalEffect } from '@preact/signals';
import { useRef } from 'preact/hooks';

import { ArrowDropUpIcon, CallEndOutlinedIcon } from '../assets/icons';
import CallNotificationsSlot from '../components/CallNotificationsSlot';
import Flag from '../components/Flag';
import { MuteIconButton } from '../components/MuteButton';
import { setIsCollapsed, widgetState } from '../stores/widgetStore';
import type { CustomerData } from '../types/types';
import { Divider, IconButton, Spinner, Tooltip } from '../ui';
import { callStatus, useLocalTime } from '../utils';
import { countryName } from '../utils/country';

interface CollapsedCallBarProps {
  customer: CustomerData;
  onEndCall: () => void;
}

const CollapsedCallBar = ({ customer, onEndCall }: CollapsedCallBarProps) => {
  const statusRef = useRef<HTMLSpanElement>(null);

  useSignalEffect(() => {
    const el = statusRef.current;
    if (!el) return;
    const duration = callStatus.duration;
    if (duration) {
      el.textContent = duration;
      el.dataset.mode = 'duration';
    } else {
      el.textContent = callStatus.label;
      el.dataset.mode = 'label';
    }
  });

  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;
  const brandName = customer.brandName || '-';
  const countryLabel = countryName(customer.country);

  return (
    <div class='cw-bar'>
      <CallNotificationsSlot class='cw-bar__notifs' />

      <div class='cw-bar__main'>
        <div class='cw-bar__top'>
          <div class='cw-bar__country'>
            <Flag country={customer.country} title={customer.country} />
            <span class='cw-text-body3 cw-text-secondary'>
              {customer.country}
              {countryLabel ? ` / ${countryLabel}` : ''}
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
            <span ref={statusRef} class='cw-bar__status-text' />
          </div>

          <div class='cw-bar__actions'>
            <MuteIconButton />
            <Tooltip title={widgetState.isEnding ? 'Ending…' : 'End call'}>
              <IconButton
                size='small'
                onClick={onEndCall}
                disabled={widgetState.isEnding}
                style={{ color: 'var(--cw-error-fg)' }}
              >
                {widgetState.isEnding ? (
                  <Spinner size={16} />
                ) : (
                  <CallEndOutlinedIcon />
                )}
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
