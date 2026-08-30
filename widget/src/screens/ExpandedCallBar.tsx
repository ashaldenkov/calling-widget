import { useSignalEffect } from '@preact/signals';
import { useRef } from 'preact/hooks';

import {
  ArrowDropDownIcon,
  CallEndOutlinedIcon,
  EditOutlinedIcon,
} from '../assets/icons';
import CallNotificationsSlot from '../components/CallNotificationsSlot';
import Flag from '../components/Flag';
import MuteButton from '../components/MuteButton';
import { setIsCollapsed, setScreen, widgetState } from '../stores/widgetStore';
import type { CustomerData } from '../types/types';
import { Button, Chip, Divider, IconButton, Spinner } from '../ui';
import { callStatus, useLocalTime } from '../utils';
import { countryName } from '../utils/country';

interface ExpandedCallBarProps {
  customer: CustomerData;
  onEndCall: () => void;
}

const ExpandedCallBar = ({ customer, onEndCall }: ExpandedCallBarProps) => {
  const labelRef = useRef<HTMLSpanElement>(null);
  const durationRef = useRef<HTMLSpanElement>(null);

  useSignalEffect(() => {
    if (labelRef.current) labelRef.current.textContent = callStatus.label;
    const duration = callStatus.duration;
    const el = durationRef.current;
    if (!el) return;
    if (duration) {
      el.textContent = duration;
      el.hidden = false;
    } else {
      el.textContent = '';
      el.hidden = true;
    }
  });

  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;
  const countryLabel = countryName(customer.country);

  const webBaseUrl = widgetState.initOptions?.webBaseUrl;
  const handleGoToProfile = () => {
    if (!webBaseUrl) return;
    window.open(webBaseUrl, '_blank', 'noopener');
  };

  return (
    <div class='cw-bar-expanded'>
      <div class='cw-bar-expanded__header'>
        <h6 class='cw-text-h6 cw-bar-expanded__title'>Call Information</h6>
        <IconButton
          size='small'
          onClick={() => setIsCollapsed(true)}
          style={{ color: 'var(--cw-text-secondary)' }}
        >
          <ArrowDropDownIcon />
        </IconButton>
      </div>

      <div class='cw-bar-expanded__body'>
        <CallNotificationsSlot class='cw-bar-expanded__notifs' />

        <div class='cw-bar-expanded__main'>
          <div class='cw-bar-expanded__row cw-bar-expanded__row--country'>
            <div class='cw-flex-row-center cw-bar-expanded__country'>
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

          <div class='cw-bar-expanded__row'>
            <span class='cw-text-body3 cw-text-secondary cw-bar-expanded__label'>
              Customer
            </span>
            <span class='cw-text-body3 cw-truncate'>{customerName}</span>
          </div>

          {webBaseUrl && (
            <Button
              variant='outlined'
              fullWidth
              onClick={handleGoToProfile}
              style={{ height: 32 }}
            >
              Go to profile
            </Button>
          )}

          <Divider />

          <div class='cw-bar-expanded__row'>
            <span class='cw-text-body3 cw-text-secondary cw-bar-expanded__label'>
              Brand
            </span>
            <span class='cw-text-body3 cw-truncate'>
              {customer.brandName || '-'}
            </span>
          </div>

          <div class='cw-bar-expanded__row cw-bar-expanded__row--status'>
            <span class='cw-text-body3 cw-text-secondary cw-bar-expanded__label'>
              Dialer Status:
            </span>
            <div class='cw-bar-expanded__status'>
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

          <div class='cw-bar-expanded__call-status'>
            <span ref={labelRef} class='cw-text-body3 cw-text-secondary' />
            <span ref={durationRef} class='cw-text-body1' hidden />
          </div>

          <div class='cw-bar-expanded__actions'>
            <MuteButton />

            <Button
              variant='outlined'
              tone='danger'
              onClick={onEndCall}
              disabled={widgetState.isEnding}
              startIcon={
                widgetState.isEnding ? (
                  <Spinner size={14} />
                ) : (
                  <CallEndOutlinedIcon />
                )
              }
            >
              {widgetState.isEnding ? 'Ending…' : 'End call'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExpandedCallBar;
