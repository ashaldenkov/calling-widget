import { useAutoAnimate } from '@formkit/auto-animate/preact';

import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from '../ui';

import CallNotification from './CallNotification';

interface ConfirmationDialogProps {
  open: boolean;
  title: string;
  message: string;
  onCancel: () => void;
  onConfirm: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string | null;
  onErrorClose?: () => void;
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
  error,
  onErrorClose,
}: ConfirmationDialogProps) => {
  const [parent] = useAutoAnimate<HTMLDivElement>();
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      header={
        <div ref={parent}>
          {error ? (
            <CallNotification
              type='error'
              message={error}
              onClose={onErrorClose}
            />
          ) : null}
        </div>
      }
    >
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>{message}</DialogContent>
      <DialogActions>
        <Button tone='secondary' onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
        <Button onClick={onConfirm} disabled={loading}>
          {confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmationDialog;
