import { MicIcon, MicOffIcon } from '../assets/icons';
import { setMicMuted, widgetState } from '../stores/widgetStore';
import { Button, IconButton, Tooltip } from '../ui';

const toggleMute = () => setMicMuted(!widgetState.isMicMuted);

export const MuteIconButton = () => {
  const { isMicMuted } = widgetState;
  const Icon = isMicMuted ? MicOffIcon : MicIcon;
  return (
    <Tooltip title={isMicMuted ? 'Unmute' : 'Mute'}>
      <IconButton
        size='small'
        onClick={toggleMute}
        style={{ color: 'var(--cw-text-secondary)' }}
      >
        <Icon />
      </IconButton>
    </Tooltip>
  );
};

const MuteButton = () => {
  const { isMicMuted } = widgetState;
  const Icon = isMicMuted ? MicOffIcon : MicIcon;
  return (
    <Button onClick={toggleMute} startIcon={<Icon />} style={{ minWidth: 118 }}>
      {isMicMuted ? 'Unmute' : 'Mute'}
    </Button>
  );
};

export default MuteButton;
