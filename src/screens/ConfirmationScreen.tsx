import { Box, Button, Typography } from '@mui/material';

import {
  dialogActions,
  dialogTitle,
  dialogTitlePadding,
  formButtonPrimary,
  formButtonSecondary,
} from '../theme/styles';

interface ConfirmationScreenProps {
  onCancel: () => void;
  onConfirm: () => void;
  loading?: boolean;
}

const messageTextStyles = {
  color: 'text.primary',
  fontSize: '14px',
  lineHeight: 1.715,
};

const ConfirmationScreen = ({
  onCancel,
  onConfirm,
  loading,
}: ConfirmationScreenProps) => {
  return (
    <>
      <Typography sx={{ ...dialogTitle, ...dialogTitlePadding }}>
        Start a call
      </Typography>

      <Typography sx={{ ...messageTextStyles, ...dialogTitlePadding }}>
        Are you sure you want to start a call with this client?
      </Typography>

      <Box
        sx={{
          ...dialogActions,
          py: '16px',
          display: 'flex',
          justifyContent: 'flex-end',
        }}
      >
        <Button onClick={onCancel} variant='contained' sx={formButtonSecondary}>
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={onConfirm}
          disabled={loading}
          sx={formButtonPrimary}
        >
          Confirm
        </Button>
      </Box>
    </>
  );
};

export default ConfirmationScreen;
