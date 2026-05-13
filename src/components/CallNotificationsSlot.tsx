import { useAutoAnimate } from '@formkit/auto-animate/preact';

import { setNotification, widgetState } from '../stores/widgetStore';
import { muteNotification } from '../utils';

import CallNotification from './CallNotification';

interface CallNotificationsSlotProps {
  class?: string;
}

const CallNotificationsSlot = ({
  class: className,
}: CallNotificationsSlotProps) => {
  const [parent] = useAutoAnimate<HTMLDivElement>();
  const { notification } = widgetState;

  return (
    <div ref={parent} class={className}>
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
  );
};

export default CallNotificationsSlot;
