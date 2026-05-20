import { MicIcon, MicOffIcon } from '../assets/icons';
import { setMicMuted, widgetState } from '../stores/widgetStore';
import { CallState } from '../types/types';
import { Button, IconButton, Tooltip } from '../ui';
import { RecoveryState } from '../utils/callRecovery';

const toggleMute = () => setMicMuted(!widgetState.isMicMuted);

const isMuteDisabled = () =>
  widgetState.callState === CallState.Failed ||
  widgetState.callState === CallState.Ended ||
  widgetState.callState === CallState.Idle ||
  widgetState.recoveryStatus === RecoveryState.Unstable;

export const MuteIconButton = () => {
  const { isMicMuted } = widgetState;
  const disabled = isMuteDisabled();
  const Icon = isMicMuted ? MicOffIcon : MicIcon;
  return (
    <Tooltip title={isMicMuted ? 'Unmute' : 'Mute'}>
      <IconButton
        size='small'
        onClick={toggleMute}
        disabled={disabled}
        style={{ color: 'var(--cw-text-secondary)' }}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );
};

const MuteButton = () => {
  const { isMicMuted } = widgetState;
  const disabled = isMuteDisabled();
  const Icon = isMicMuted ? MicOffIcon : MicIcon;
  return (
    <Button
      onClick={toggleMute}
      disabled={disabled}
      startIcon={<Icon />}
      style={{ minWidth: 118 }}
    >
      {isMicMuted ? 'Unmute' : 'Mute'}
    </Button>
  );
};

export default MuteButton;
