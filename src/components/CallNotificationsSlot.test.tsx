import { fireEvent, render } from '@testing-library/preact';

vi.mock('@formkit/auto-animate/preact', () => ({
  useAutoAnimate: () => [{ current: null }],
}));

const { muteNotification } = vi.hoisted(() => ({
  muteNotification: { visible: false, countdown: 5 },
}));

vi.mock('../utils', () => ({
  muteNotification,
}));

import { setNotification, widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';

import CallNotificationsSlot from './CallNotificationsSlot';

beforeEach(() => {
  vi.clearAllMocks();
  resetWidgetState();
  muteNotification.visible = false;
  muteNotification.countdown = 5;
});

describe('CallNotificationsSlot', () => {
  it('renders nothing when neither the mute notification nor an error is present', () => {
    const { container } = render(<CallNotificationsSlot />);
    expect(container.querySelector('.cw-notif')).not.toBeInTheDocument();
  });

  it('applies the provided class to the container', () => {
    const { container } = render(<CallNotificationsSlot class='my-slot' />);
    expect(container.firstElementChild).toHaveClass('my-slot');
  });

  it('renders the muted info notification with countdown when muteNotification is visible', () => {
    muteNotification.visible = true;
    muteNotification.countdown = 4;
    const { container } = render(<CallNotificationsSlot />);
    const notif = container.querySelector('.cw-notif[data-type="info"]');
    expect(notif).toBeInTheDocument();
    expect(notif).toHaveTextContent('The microphone is muted.');
    expect(container.querySelector('.cw-notif__ring-label')).toHaveTextContent(
      '4',
    );
  });

  it('renders the error notification and clears it on close when a notification is set', () => {
    widgetState.notification = 'Connection lost';
    const { container } = render(<CallNotificationsSlot />);
    const notif = container.querySelector('.cw-notif[data-type="error"]');
    expect(notif).toBeInTheDocument();
    expect(notif).toHaveTextContent('Connection lost');

    fireEvent.click(notif!.querySelector('button')!);
    expect(widgetState.notification).toBeNull();
  });

  it('does not render the mute notification when it is not visible but shows the error one', () => {
    setNotification('Some error');
    const { container } = render(<CallNotificationsSlot />);
    expect(
      container.querySelector('.cw-notif[data-type="info"]'),
    ).not.toBeInTheDocument();
    expect(
      container.querySelector('.cw-notif[data-type="error"]'),
    ).toBeInTheDocument();
  });
});
