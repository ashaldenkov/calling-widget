import type { ComponentChildren } from 'preact';

import { CloseIcon } from '../assets/icons';
import { IconButton } from '../ui';

type NotificationType = 'info' | 'error';

interface CallNotificationProps {
  type: NotificationType;
  message: ComponentChildren;
  countdown?: number;
  onClose?: () => void;
}

const RING_RADIUS = 10;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

const CountdownRing = ({ countdown }: { countdown: number }) => (
  <span class='cw-notif__ring'>
    <svg width='26' height='26' viewBox='0 0 26 26' aria-hidden='true'>
      <circle
        cx='13'
        cy='13'
        r={RING_RADIUS}
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        opacity='0.2'
      />
      <circle
        class='cw-notif__ring-progress'
        cx='13'
        cy='13'
        r={RING_RADIUS}
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-dasharray={RING_CIRCUMFERENCE}
        stroke-linecap='round'
        transform='rotate(-90 13 13) scale(1 -1) translate(0 -26)'
        style={{ '--cw-ring-circumference': RING_CIRCUMFERENCE }}
      />
    </svg>
    <span class='cw-notif__ring-label'>{countdown}</span>
  </span>
);

const CallNotification = ({
  type,
  message,
  countdown,
  onClose,
}: CallNotificationProps) => (
  <div class='cw-notif' data-type={type}>
    <span class='cw-notif__message'>{message}</span>
    {type === 'info' && countdown !== undefined ? (
      <CountdownRing countdown={countdown} />
    ) : null}
    {type === 'error' && onClose ? (
      <IconButton size='small' onClick={onClose}>
        <CloseIcon size={18} />
      </IconButton>
    ) : null}
  </div>
);

export default CallNotification;
