import CloseIcon from '@mui/icons-material/Close';
import { Box, IconButton, Typography } from '@mui/material';

import CallNotification from '../components/CallNotification';
import {
  dialogTitle,
  dialogTitlePadding,
  flexBetweenCenter,
} from '../theme/styles';

interface ErrorScreenProps {
  onClose: () => void;
  message?: string;
}

const ErrorScreen = ({
  onClose,
  message = 'Something went wrong.',
}: ErrorScreenProps) => (
  <>
    <Box sx={{ ...flexBetweenCenter, ...dialogTitlePadding }}>
      <Typography variant='h6' sx={dialogTitle}>
        Call Information
      </Typography>
      <IconButton onClick={onClose} size='small' sx={{ p: 0 }}>
        <CloseIcon />
      </IconButton>
    </Box>
    <Box sx={{ px: '24px', pb: '24px', pt: '8px' }}>
      <CallNotification type='error' message={message} />
    </Box>
  </>
);

export default ErrorScreen;
