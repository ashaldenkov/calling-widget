import type { ComponentChildren } from 'preact';
import { useEffect } from 'preact/hooks';

interface DialogProps {
  open: boolean;
  onClose?: () => void;
  header?: ComponentChildren;
  children: ComponentChildren;
}

export const Dialog = ({ open, onClose, header, children }: DialogProps) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return (
    <div class='cw-dialog' data-open={open ? '' : undefined} inert={!open}>
      <div class='cw-dialog__backdrop' onClick={onClose} aria-hidden='true' />
      <div class='cw-dialog__stack'>
        {header}
        <div class='cw-dialog__panel' role='dialog' aria-modal='true'>
          {children}
        </div>
      </div>
    </div>
  );
};

export const DialogTitle = ({ children }: { children: ComponentChildren }) => (
  <div class='cw-dialog__title'>{children}</div>
);

export const DialogContent = ({
  children,
}: {
  children: ComponentChildren;
}) => <div class='cw-dialog__content'>{children}</div>;

export const DialogActions = ({
  children,
}: {
  children: ComponentChildren;
}) => <div class='cw-dialog__actions'>{children}</div>;
