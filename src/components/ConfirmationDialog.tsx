import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '@mui/material';

import { formButtonPrimary } from '../theme/styles';
import { formButtonSecondary } from '../theme/styles';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
}

const ConfirmationDialog = ({
  open,
  title,
  message,
  onCancel,
  onConfirm,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  loading,
}: ConfirmationDialogProps) => {
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      disablePortal
      disableScrollLock
      disableEnforceFocus
      sx={{ position: 'absolute' }}
      slotProps={{
        backdrop: {
          sx: {
            position: 'absolute',
          },
        },
        paper: {
          sx: {
            position: 'absolute',
            bottom: 24,
            left: 24,
            right: 24,
            m: 0,
            width: 'auto',
            boxShadow: '0px 8px 24px 0px #2233541F',
            borderRadius: 2,
          },
        },
      }}
    >
      <DialogTitle variant='h6'>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button sx={formButtonSecondary} onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button sx={formButtonPrimary} onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
