import { fireEvent, render, screen } from '@testing-library/preact';

import ConfirmationDialog from './ConfirmationDialog';

const baseProps = {
  open: true,
  title: 'Delete item',
  message: 'Are you sure?',
  onCancel: vi.fn(),
  onConfirm: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('ConfirmationDialog', () => {
  it('renders title, message and default confirm/cancel labels when open', () => {
    render(<ConfirmationDialog {...baseProps} />);

    expect(screen.getByText('Delete item')).toBeInTheDocument();
    expect(screen.getByText('Are you sure?')).toBeInTheDocument();
    expect(screen.getByText('Confirm')).toBeInTheDocument();
    expect(screen.getByText('Cancel')).toBeInTheDocument();
  });

  it('renders custom confirm/cancel labels', () => {
    render(
      <ConfirmationDialog
        {...baseProps}
        confirmLabel='Yes, delete'
        cancelLabel='Keep it'
      />,
    );

    expect(screen.getByText('Yes, delete')).toBeInTheDocument();
    expect(screen.getByText('Keep it')).toBeInTheDocument();
  });

  it('disables both action buttons while loading', () => {
    render(<ConfirmationDialog {...baseProps} loading />);

    expect(screen.getByText('Confirm')).toBeDisabled();
    expect(screen.getByText('Cancel')).toBeDisabled();
  });

  it('renders an error CallNotification and closes it via onErrorClose', () => {
    const onErrorClose = vi.fn();
    render(
      <ConfirmationDialog
        {...baseProps}
        error='Something failed'
        onErrorClose={onErrorClose}
      />,
    );

    const notif = document.querySelector('.cw-notif[data-type="error"]');
    expect(notif).toBeInTheDocument();
    expect(notif).toHaveTextContent('Something failed');

    const closeBtn = notif?.querySelector('button');
    fireEvent.click(closeBtn!);
    expect(onErrorClose).toHaveBeenCalledOnce();
  });

  it('does not render an error notification when error is not set', () => {
    render(<ConfirmationDialog {...baseProps} />);
    expect(
      document.querySelector('.cw-notif[data-type="error"]'),
    ).not.toBeInTheDocument();
  });

  it('calls onConfirm when the confirm button is clicked', () => {
    const onConfirm = vi.fn();
    render(<ConfirmationDialog {...baseProps} onConfirm={onConfirm} />);
    fireEvent.click(screen.getByText('Confirm'));
    expect(onConfirm).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmationDialog {...baseProps} onCancel={onCancel} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when the backdrop (outside the panel) is clicked', () => {
    const onCancel = vi.fn();
    render(<ConfirmationDialog {...baseProps} onCancel={onCancel} />);

    const backdrop = document.querySelector('.cw-dialog__backdrop');
    fireEvent.click(backdrop!);
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('calls onCancel when Escape is pressed while open', () => {
    const onCancel = vi.fn();
    render(<ConfirmationDialog {...baseProps} onCancel={onCancel} />);

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('does not react to Escape when the dialog is closed', () => {
    const onCancel = vi.fn();
    render(
      <ConfirmationDialog {...baseProps} open={false} onCancel={onCancel} />,
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onCancel).not.toHaveBeenCalled();
  });

  it('marks the dialog inert (not interactive) when open is false', () => {
    render(<ConfirmationDialog {...baseProps} open={false} />);
    const dialog = document.querySelector('.cw-dialog');
    expect(dialog).not.toHaveAttribute('data-open');
    expect(dialog).toHaveAttribute('inert');
  });
});
