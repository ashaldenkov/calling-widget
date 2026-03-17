import CloseIcon from '@mui/icons-material/Close';
import { Box, CircularProgress, IconButton, Typography } from '@mui/material';
import React from 'react';

import { colors } from '../theme/colors';
import { flexBetweenCenter } from '../theme/styles';
import { MUTE_NOTIFICATION_DURATION } from '../utils';

type NotificationType = 'info' | 'error';

interface CallNotificationProps {
  type: NotificationType;
  message: React.ReactNode;
  countdown?: number;
  onClose?: () => void;
}

const styleMap = {
  info: {
    backgroundColor: colors.blue100,
    color: colors.blue400,
    progressColor: colors.blue400,
  },
  error: {
    backgroundColor: colors.red100,
    color: colors.red700,
    progressColor: colors.red700,
  },
};

const CallNotification = ({
  type,
  message,
  countdown,
  onClose,
}: CallNotificationProps) => {
  const styles = styleMap[type];

  return (
    <Box
      sx={{
        ...flexBetweenCenter,
        backgroundColor: styles.backgroundColor,
        borderRadius: '8px',
        pl: '16px',
        pr: '8px',
        py: '8px',
      }}
    >
      <Typography variant='body1' sx={{ color: styles.color }}>
        {message}
      </Typography>
      {type === 'info' && countdown !== undefined && (
        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
          <Box sx={{ transform: 'scaleX(-1)', display: 'flex' }}>
            <CircularProgress
              variant='determinate'
              value={(countdown / MUTE_NOTIFICATION_DURATION) * 100}
              size={26}
              thickness={3}
              sx={{ color: styles.progressColor }}
            />
          </Box>
          <Box
            sx={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography
              sx={{
                color: styles.progressColor,
                fontSize: 12,
                lineHeight: 1,
              }}
            >
              {countdown}
            </Typography>
          </Box>
        </Box>
      )}
      {type === 'error' && onClose && (
        <IconButton onClick={onClose} size='small' sx={{ p: '4px' }}>
          <CloseIcon sx={{ color: styles.color, fontSize: 18 }} />
        </IconButton>
      )}
    </Box>
  );
};

export default CallNotification;
