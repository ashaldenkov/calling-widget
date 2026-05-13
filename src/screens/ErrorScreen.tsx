import { CloseIcon } from '../assets/icons';
import CallNotification from '../components/CallNotification';
import { IconButton } from '../ui';

interface ErrorScreenProps {
  onClose: () => void;
  message?: string;
}

const ErrorScreen = ({
  onClose,
  message = 'Something went wrong.',
}: ErrorScreenProps) => (
  <div class='cw-screen-error'>
    <div class='cw-screen-error__header'>
      <h6 class='cw-text-h6 cw-screen-title cw-screen-error__title'>
        Call Information
      </h6>
      <IconButton
        size='small'
        onClick={onClose}
        style={{ color: 'var(--cw-text-secondary)' }}
      >
        <CloseIcon />
      </IconButton>
    </div>
    <div class='cw-screen-error__body'>
      <CallNotification type='error' message={message} />
    </div>
  </div>
);

export default ErrorScreen;
