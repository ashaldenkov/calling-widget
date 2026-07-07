import { fireEvent, render, screen } from '@testing-library/preact';

import CallNotification from './CallNotification';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CallNotification', () => {
  it('renders the message and the type on data-type', () => {
    const { container } = render(
      <CallNotification type='info' message='Hello there' />,
    );
    expect(screen.getByText('Hello there')).toBeInTheDocument();
    expect(container.querySelector('.cw-notif')).toHaveAttribute(
      'data-type',
      'info',
    );
  });

  it('renders the countdown ring for info type when countdown is provided', () => {
    const { container } = render(
      <CallNotification type='info' message='Muted' countdown={3} />,
    );
    expect(container.querySelector('.cw-notif__ring')).toBeInTheDocument();
    expect(
      container.querySelector('.cw-notif__ring-progress'),
    ).toBeInTheDocument();
    expect(container.querySelector('.cw-notif__ring-label')).toHaveTextContent(
      '3',
    );
  });

  it('does not render the countdown ring for info type when countdown is undefined', () => {
    const { container } = render(
      <CallNotification type='info' message='No ring' />,
    );
    expect(container.querySelector('.cw-notif__ring')).not.toBeInTheDocument();
  });

  it('does not render the countdown ring for error type even with a countdown', () => {
    const { container } = render(
      <CallNotification type='error' message='Boom' countdown={5} />,
    );
    expect(container.querySelector('.cw-notif__ring')).not.toBeInTheDocument();
  });

  it('renders a close button for error type with onClose and invokes it', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CallNotification type='error' message='Boom' onClose={onClose} />,
    );
    const closeBtn = container.querySelector('.cw-notif button');
    expect(closeBtn).toBeInTheDocument();
    fireEvent.click(closeBtn!);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('does not render a close button for error type without onClose', () => {
    const { container } = render(
      <CallNotification type='error' message='Boom' />,
    );
    expect(container.querySelector('.cw-notif button')).not.toBeInTheDocument();
  });

  it('does not render a close button for info type even with onClose', () => {
    const onClose = vi.fn();
    const { container } = render(
      <CallNotification type='info' message='Info' onClose={onClose} />,
    );
    expect(container.querySelector('.cw-notif button')).not.toBeInTheDocument();
    expect(onClose).not.toHaveBeenCalled();
  });
});
