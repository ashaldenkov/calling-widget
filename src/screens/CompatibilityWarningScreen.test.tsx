import { fireEvent, render, screen } from '@testing-library/preact';

import type { BrowserWarning } from '../utils/browserDetection';

import CompatibilityWarningScreen from './CompatibilityWarningScreen';

const onContinue = vi.fn();
const onDismiss = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();
});

describe('CompatibilityWarningScreen', () => {
  it('renders the screen title', () => {
    render(
      <CompatibilityWarningScreen
        warnings={[]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    expect(
      screen.getByText('Browser Compatibility Warning'),
    ).toBeInTheDocument();
  });

  it('renders an unsupportedBrowser warning containing the browser name', () => {
    const warning: BrowserWarning = {
      type: 'unsupportedBrowser',
      browser: 'Firefox',
    };
    const { container } = render(
      <CompatibilityWarningScreen
        warnings={[warning]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    expect(container).toHaveTextContent('Firefox');
    expect(container).toHaveTextContent('please use Google Chrome');
  });

  it('renders an oldChrome warning containing the version number', () => {
    const warning: BrowserWarning = { type: 'oldChrome', version: 120 };
    const { container } = render(
      <CompatibilityWarningScreen
        warnings={[warning]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    expect(container).toHaveTextContent('120');
    expect(container).toHaveTextContent('please update Google Chrome');
  });

  it('renders a mobileDevice warning', () => {
    const warning: BrowserWarning = { type: 'mobileDevice' };
    const { container } = render(
      <CompatibilityWarningScreen
        warnings={[warning]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    expect(container).toHaveTextContent('desktop solutions');
  });

  it('renders one notification per warning when multiple warnings are present', () => {
    const warnings: BrowserWarning[] = [
      { type: 'unsupportedBrowser', browser: 'Safari' },
      { type: 'mobileDevice' },
    ];
    const { container } = render(
      <CompatibilityWarningScreen
        warnings={warnings}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    expect(container).toHaveTextContent('Safari');
    expect(container).toHaveTextContent('desktop solutions');
  });

  it('calls onContinue when the "Continue anyway" button is clicked', () => {
    render(
      <CompatibilityWarningScreen
        warnings={[]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByText('Continue anyway'));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it('calls onDismiss when the "Dismiss" button is clicked', () => {
    render(
      <CompatibilityWarningScreen
        warnings={[]}
        onContinue={onContinue}
        onDismiss={onDismiss}
      />,
    );
    fireEvent.click(screen.getByText('Dismiss'));
    expect(onDismiss).toHaveBeenCalledOnce();
  });
});
