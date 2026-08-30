import { fireEvent, render, screen } from '@testing-library/preact';

import ErrorScreen from './ErrorScreen';

describe('ErrorScreen', () => {
  it('renders the provided message inside the error notification', () => {
    render(<ErrorScreen onClose={vi.fn()} message='Line went dead' />);

    const notif = document.querySelector('.cw-notif[data-type="error"]');
    expect(notif).toBeInTheDocument();
    expect(notif).toHaveTextContent('Line went dead');
  });

  it('falls back to a default message when none is provided', () => {
    render(<ErrorScreen onClose={vi.fn()} />);
    expect(screen.getByText('Something went wrong.')).toBeInTheDocument();
  });

  it('calls onClose when the close button is clicked', () => {
    const onClose = vi.fn();
    const { container } = render(<ErrorScreen onClose={onClose} />);

    const closeBtn = container.querySelector('.cw-screen-error__header button');
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });
});
