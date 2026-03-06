import { ArrowDropDown } from '@mui/icons-material';
import { MicNone as MicIcon } from '@mui/icons-material';
import CallEndOutlinedIcon from '@mui/icons-material/CallEndOutlined';
import MicOffIcon from '@mui/icons-material/MicOffOutlined';
import {
  Box,
  Button,
  Chip,
  Collapse,
  Divider,
  IconButton,
  Typography,
} from '@mui/material';
import { getCountryData } from 'countries-list';
import * as flags from 'country-flag-icons/react/3x2';

import CallNotification from '../components/CallNotification';
import { useWidgetStore } from '../stores/widgetStore';
import { colors } from '../theme/colors';
import {
  chipBase,
  dialogTitle,
  dialogTitlePadding,
  flexBetweenCenter,
  flexCenter,
  flexRowCenter,
  formButtonPrimary,
  truncateText,
} from '../theme/styles';
import type { CustomerData } from '../types/types';
import { useCallStatus, useLocalTime, useMuteNotification } from '../utils';

interface CallInformationScreenProps {
  customer: CustomerData;
  onCollapse: () => void;
  onEndCall: () => void;
}

const CallInformationScreen = ({
  customer,
  onCollapse,
  onEndCall,
}: CallInformationScreenProps) => {
  const { isMicMuted, setMicMuted, notification, setNotification } =
    useWidgetStore();
  const muteNotification = useMuteNotification();
  const { label: callStatusLabel, duration: callDuration } = useCallStatus();

  const FlagIcon = flags[customer.country.toUpperCase() as keyof typeof flags];
  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;

  const handleEndCall = () => {
    onEndCall();
  };

  const countryName = getCountryData(customer.country).name;

  const handleGoToProfile = () => {
    const webUrl = useWidgetStore.getState().config?.webBaseUrl ?? '';
    window.open(`${webUrl}/customers/${customer.id}`, '_blank');
  };

  return (
    <>
      <Box sx={{ ...flexBetweenCenter, ...dialogTitlePadding }}>
        <Typography variant='h6' sx={dialogTitle}>
          Call Information
        </Typography>
        <IconButton onClick={onCollapse} size='small' sx={{ p: 0 }}>
          <ArrowDropDown />
        </IconButton>
      </Box>

      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          p: '8px 24px 24px 24px',
        }}
      >
        <Collapse in={muteNotification.visible} timeout={300} unmountOnExit>
          <CallNotification
            type='info'
            message='The microphone is muted.'
            countdown={muteNotification.countdown}
          />
        </Collapse>
        <Collapse in={!!notification} timeout={300} unmountOnExit>
          <CallNotification
            type='error'
            message='Something went wrong.'
            onClose={() => setNotification(null)}
          />
        </Collapse>
        <Box sx={{ ...flexBetweenCenter, height: 42, gap: '8px' }}>
          <Box sx={{ ...flexRowCenter, gap: '8px' }}>
            {FlagIcon && (
              <FlagIcon
                style={{
                  height: 16,
                  width: 22,
                  borderRadius: 2,
                }}
                title={customer.country}
              />
            )}
            <Typography
              variant='body3'
              sx={{ color: 'textColor.secondary.default' }}
            >
              {customer.country}
              {countryName ? ` / ${countryName}` : ''}
            </Typography>
          </Box>
          <Typography
            variant='body3'
            sx={{ color: 'textColor.secondary.default' }}
          >
            Local time: {localTime}
          </Typography>
        </Box>

        <Box sx={{ ...flexBetweenCenter, height: 20, gap: '8px' }}>
          <Typography
            variant='body3'
            sx={{ color: 'textColor.secondary.default', flexShrink: 0 }}
          >
            Customer
          </Typography>
          <Typography variant='body3' sx={truncateText}>
            {customerName}
          </Typography>
        </Box>

        <Button
          variant='outlined'
          color='primary'
          fullWidth
          onClick={handleGoToProfile}
          sx={{
            height: 32,
            textTransform: 'none',
          }}
        >
          Go to profile in Calleague
        </Button>

        <Divider />

        <Box sx={{ ...flexBetweenCenter, height: 20, gap: '8px' }}>
          <Typography
            variant='body3'
            sx={{ color: 'textColor.secondary.default', flexShrink: 0 }}
          >
            Brand
          </Typography>
          <Typography variant='body3' sx={truncateText}>
            {customer.brandName || '-'}
          </Typography>
        </Box>

        <Box sx={{ ...flexBetweenCenter, height: 28, gap: '8px' }}>
          <Typography
            variant='body3'
            sx={{ color: 'textColor.secondary.default', flexShrink: 0 }}
          >
            Dialer Status:
          </Typography>
          {customer.status ? (
            <Chip
              label={customer.status.name}
              size='small'
              sx={{
                ...chipBase,
                maxWidth: '80%',
                backgroundColor: `${customer.status.color}20`,
                border: `1px solid ${customer.status.color}`,
                color: 'text.primary',
                borderRadius: '100px',
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ) : (
            <Typography variant='body3'>N/A</Typography>
          )}
        </Box>

        <Box
          sx={{
            ...flexCenter,
            gap: '16px',
            backgroundColor: colors.gray050,
            borderRadius: '8px',
            p: '20px',
          }}
        >
          <Typography
            variant='body1'
            sx={{ color: 'textColor.secondary.default' }}
          >
            {callStatusLabel}
          </Typography>
          {callDuration && (
            <Typography variant='body2'>{callDuration}</Typography>
          )}
        </Box>

        <Box sx={flexBetweenCenter}>
          <Button
            variant='contained'
            onClick={() => setMicMuted(!isMicMuted)}
            startIcon={isMicMuted ? <MicOffIcon /> : <MicIcon />}
            sx={{ ...formButtonPrimary, width: 118, height: 44 }}
          >
            {isMicMuted ? 'Unmute' : 'Mute'}
          </Button>

          <Button
            variant='outlined'
            onClick={handleEndCall}
            startIcon={<CallEndOutlinedIcon />}
            sx={{
              width: 118,
              height: 44,
              borderColor: colors.red700,
              color: colors.red700,
              textTransform: 'capitalize',
            }}
          >
            End call
          </Button>
        </Box>
      </Box>
    </>
  );
};

export default CallInformationScreen;
