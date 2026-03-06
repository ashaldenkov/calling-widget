import { Box, Button, Typography } from '@mui/material';

import { colors } from '../theme/colors';
import {
  dialogActions,
  dialogTitle,
  dialogTitlePadding,
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

const buttonStyles = {
  height: '40px',
  padding: '10px 22px',
  textTransform: 'none',
  borderRadius: 2,
  fontSize: 14,
  fontWeight: 500,
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
        <Button
          onClick={onCancel}
          variant='contained'
          sx={{
            ...buttonStyles,
            backgroundColor: 'background.default',
            color: 'textColor.primary.default',
            '&:hover': {
              backgroundColor: 'action.hover',
            },
          }}
        >
          Cancel
        </Button>
        <Button
          variant='contained'
          onClick={onConfirm}
          disabled={loading}
          sx={{
            ...buttonStyles,
            backgroundColor: colors.teal500,
            color: 'white',
            '&:hover': {
              opacity: 0.9,
            },
          }}
        >
          Confirm
        </Button>
      </Box>
    </>
  );
};

export default ConfirmationScreen;
