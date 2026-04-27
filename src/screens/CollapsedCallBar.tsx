import { ArrowDropUp } from '@mui/icons-material';
import { MicNone as MicIcon } from '@mui/icons-material';
import CallEndOutlinedIcon from '@mui/icons-material/CallEndOutlined';
import MicOffIcon from '@mui/icons-material/MicOffOutlined';
import {
  Box,
  Collapse,
  Divider,
  IconButton,
  Tooltip,
  Typography,
} from '@mui/material';
import { getCountryData } from 'countries-list';
import * as flags from 'country-flag-icons/react/3x2';

import CallNotification from '../components/CallNotification';
import {
  setIsCollapsed,
  setMicMuted,
  setNotification,
  widgetState,
} from '../stores/widgetStore';
import { colors } from '../theme/colors';
import {
  flexBetweenCenter,
  flexCenter,
  flexRowCenter,
  truncateText,
} from '../theme/styles';
import type { CustomerData } from '../types/types';
import { callStatus, muteNotification, useLocalTime } from '../utils';

interface CollapsedCallBarProps {
  customer: CustomerData;
  onEndCall: () => void;
}

const CollapsedCallBar = ({ customer, onEndCall }: CollapsedCallBarProps) => {
  const { isMicMuted, notification } = widgetState;
  const { label: callStatusLabel, duration: callDuration } = callStatus;

  const FlagIcon = flags[customer.country.toUpperCase() as keyof typeof flags];
  const localTime = useLocalTime(customer.country);
  const customerName = `${customer.firstName} ${customer.lastName}`;
  const brandName = customer.brandName || '-';
  const countryName = getCountryData(customer.country).name;

  const handleEndCall = () => {
    onEndCall();
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
        px: '24px',
        py: '16px',
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
          message={notification}
          onClose={() => setNotification(null)}
        />
      </Collapse>
      <Box
        sx={{
          ...flexBetweenCenter,
          height: 42,
          gap: '8px',
        }}
      >
        <Box
          sx={{
            ...flexRowCenter,
            gap: '8px',
            minWidth: 0,
          }}
        >
          {FlagIcon && (
            <FlagIcon
              style={{
                height: 16,
                width: 22,
                borderRadius: 2,
                flexShrink: 0,
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

      <Box sx={{ ...flexRowCenter, gap: '16px', height: 48 }}>
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            gap: '8px',
            flex: 1,
            minWidth: 0,
          }}
        >
          <Tooltip placement='top' title={customerName}>
            <Typography variant='body3' sx={truncateText}>
              {customerName}
            </Typography>
          </Tooltip>
          <Tooltip placement='top' title={brandName}>
            <Typography variant='body3' sx={truncateText}>
              {brandName}
            </Typography>
          </Tooltip>
        </Box>

        <Box
          sx={{
            width: 152,
            flexShrink: 0,
            ...flexCenter,
            alignSelf: 'stretch',
            backgroundColor: colors.gray050,
            borderRadius: '8px',
            px: '16px',
          }}
        >
          {callDuration ? (
            <Typography
              variant='body2'
              sx={{ color: 'textColor.primary.default' }}
            >
              {callDuration}
            </Typography>
          ) : (
            <Typography
              variant='body3'
              sx={{ color: 'textColor.secondary.default' }}
            >
              {callStatusLabel}
            </Typography>
          )}
        </Box>

        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '16px',
            flexShrink: 0,
          }}
        >
          <Tooltip placement='top' title={isMicMuted ? 'Unmute' : 'Mute'}>
            <IconButton
              onClick={() => setMicMuted(!isMicMuted)}
              size='small'
              sx={{ p: 0 }}
            >
              {isMicMuted ? (
                <MicOffIcon sx={{ color: colors.gray700 }} />
              ) : (
                <MicIcon sx={{ color: colors.gray700 }} />
              )}
            </IconButton>
          </Tooltip>
          <Tooltip placement='top' title='End call'>
            <IconButton onClick={handleEndCall} size='small' sx={{ p: 0 }}>
              <CallEndOutlinedIcon sx={{ color: colors.red700 }} />
            </IconButton>
          </Tooltip>
          <Divider orientation='vertical' flexItem sx={{ height: 32 }} />
          <IconButton
            onClick={() => setIsCollapsed(false)}
            size='small'
            sx={{ p: 0 }}
          >
            <ArrowDropUp sx={{ color: colors.teal500 }} />
          </IconButton>
        </Box>
      </Box>
    </Box>
  );
};

export default CollapsedCallBar;
