import { render, screen } from '@testing-library/preact';

import { Spinner } from './Spinner';

describe('Spinner', () => {
  it('defaults to size 24', () => {
    render(<Spinner />);
    const el = screen.getByRole('status');
    expect(el.style.width).toBe('24px');
    expect(el.style.height).toBe('24px');
    expect(el).toHaveAttribute('aria-label', 'Loading');
  });

  it('honors an explicit size', () => {
    render(<Spinner size={40} />);
    const el = screen.getByRole('status');
    expect(el.style.width).toBe('40px');
    expect(el.style.height).toBe('40px');
  });
});
