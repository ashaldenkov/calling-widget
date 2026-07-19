import CallNotification from '../components/CallNotification';
import { Button } from '../ui';

interface DemoNoticeScreenProps {
  onContinue: () => void;
  onDismiss: () => void;
}

const DemoNoticeScreen = ({ onContinue, onDismiss }: DemoNoticeScreenProps) => (
  <div class='cw-screen-demo-notice'>
    <h6 class='cw-text-h6 cw-screen-title'>Demo mode</h6>

    <div class='cw-screen-body'>
      <CallNotification
        type='info'
        message={
          <>
            This widget has no backend or telephony behind it. When you start a
            call it simply <strong>replays your microphone</strong> back to you
            so you can try the flow.
          </>
        }
      />

      <div class='cw-screen-actions'>
        <Button tone='secondary' onClick={onDismiss}>
          Cancel
        </Button>
        <Button onClick={onContinue}>Continue</Button>
      </div>
    </div>
  </div>
);

export default DemoNoticeScreen;
