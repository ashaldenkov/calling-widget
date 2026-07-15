import { render, screen } from '@testing-library/preact';

import { Chip } from './Chip';

describe('Chip', () => {
  it('renders the label', () => {
    render(<Chip label='Available' />);
    expect(screen.getByText('Available')).toBeInTheDocument();
  });

  it('applies color-derived inline styles when color is provided', () => {
    render(<Chip label='Busy' color='#ff0000' />);
    const chip = screen.getByText('Busy');
    expect(chip.style.borderColor).toBe('rgb(255, 0, 0)');
  });

  it('does not set color styles when color is omitted', () => {
    render(<Chip label='Plain' />);
    const chip = screen.getByText('Plain');
    expect(chip.style.borderColor).toBe('');
    expect(chip.style.backgroundColor).toBe('');
  });

  it('merges a caller-provided style with the color style', () => {
    render(<Chip label='Styled' color='#00ff00' style={{ opacity: '0.5' }} />);
    const chip = screen.getByText('Styled');
    expect(chip.style.opacity).toBe('0.5');
    expect(chip.style.borderColor).toBe('rgb(0, 255, 0)');
  });
});
