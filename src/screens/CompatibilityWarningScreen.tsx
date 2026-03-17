import { Box, Button, DialogActions, Typography } from '@mui/material';
import React from 'react';

import CallNotification from '../components/CallNotification';
import {
  dialogTitlePadding,
  formButtonPrimary,
  formButtonSecondary,
} from '../theme/styles';
import type { BrowserWarning } from '../utils/browserDetection';

interface CompatibilityWarningScreenProps {
  warnings: BrowserWarning[];
  onContinue: () => void;
  onDismiss: () => void;
}

function getWarningMessage(warning: BrowserWarning): React.ReactNode {
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
  <>
    <Typography variant='h6' sx={dialogTitlePadding}>
      Browser Compatibility Warning
    </Typography>
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        padding: '8px 24px',
      }}
    >
      {warnings.map((warning, i) => (
        <CallNotification
          key={i}
          type='info'
          message={getWarningMessage(warning)}
        />
      ))}
    </Box>
    <DialogActions>
      <Button
        variant='contained'
        sx={{ ...formButtonSecondary, width: 100 }}
        onClick={onDismiss}
      >
        Dismiss
      </Button>
      <Button
        variant='outlined'
        sx={{ ...formButtonPrimary, width: 150 }}
        onClick={onContinue}
      >
        Continue anyway
      </Button>
    </DialogActions>
  </>
);

export default CompatibilityWarningScreen;
