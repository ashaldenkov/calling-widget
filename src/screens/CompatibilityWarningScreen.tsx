import type { ComponentChildren } from 'preact';

import CallNotification from '../components/CallNotification';
import { Button } from '../ui';
import type { BrowserWarning } from '../utils/browserDetection';

interface CompatibilityWarningScreenProps {
  warnings: BrowserWarning[];
  onContinue: () => void;
  onDismiss: () => void;
}

function getWarningMessage(warning: BrowserWarning): ComponentChildren {
  switch (warning.type) {
    case 'unsupportedBrowser':
      return (
        <>
          Some features may not work correctly in {warning.browser}.<br />
          For the best experience, please use Google Chrome.
        </>
      );
    case 'oldChrome':
      return (
        <>
          Some features may not work correctly in Chrome version{' '}
          {warning.version}.<br />
          For the best experience, please update Google Chrome.
        </>
      );
    case 'mobileDevice':
      return (
        <>
          This widget is designed for desktop solutions.
          <br />
          Some features may not work correctly on mobile devices.
        </>
      );
  }
}

const CompatibilityWarningScreen = ({
  warnings,
  onContinue,
  onDismiss,
}: CompatibilityWarningScreenProps) => (
  <div class='cw-screen-compat'>
    <h6 class='cw-text-h6 cw-screen-title'>Browser Compatibility Warning</h6>

    <div class='cw-screen-compat__body'>
      {warnings.map((warning, i) => (
        <CallNotification
          key={i}
          type='info'
          message={getWarningMessage(warning)}
        />
      ))}
    </div>

    <div class='cw-screen-actions cw-screen-compat__actions'>
      <Button tone='secondary' onClick={onDismiss}>
        Dismiss
      </Button>
      <Button variant='outlined' onClick={onContinue}>
        Continue anyway
      </Button>
    </div>
  </div>
);

export default CompatibilityWarningScreen;
