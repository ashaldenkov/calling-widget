import { fireEvent, render, screen } from '@testing-library/preact';

import DemoNoticeScreen from './DemoNoticeScreen';

describe('DemoNoticeScreen', () => {
  it('explains that the call replays the microphone', () => {
    const { container } = render(
      <DemoNoticeScreen onContinue={vi.fn()} onDismiss={vi.fn()} />,
    );
    expect(container).toHaveTextContent(/replays your microphone/i);
  });

  it('calls onContinue when Continue is clicked', () => {
    const onContinue = vi.fn();
    render(<DemoNoticeScreen onContinue={onContinue} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByText('Continue'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when Cancel is clicked', () => {
    const onDismiss = vi.fn();
    render(<DemoNoticeScreen onContinue={vi.fn()} onDismiss={onDismiss} />);
    fireEvent.click(screen.getByText('Cancel'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
