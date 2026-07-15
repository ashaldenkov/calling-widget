import { fireEvent, render, screen } from '@testing-library/preact';

import { IconButton } from './IconButton';

describe('IconButton', () => {
  it('renders children and defaults to medium size and button type', () => {
    render(<IconButton>x</IconButton>);
    const btn = screen.getByRole('button');
    expect(btn).toHaveTextContent('x');
    expect(btn).toHaveAttribute('data-size', 'medium');
    expect(btn).toHaveAttribute('type', 'button');
  });

  it('honors an explicit size prop', () => {
    render(<IconButton size='small'>x</IconButton>);
    expect(screen.getByRole('button')).toHaveAttribute('data-size', 'small');
  });

  it('honors an explicit type prop', () => {
    render(<IconButton type='submit'>x</IconButton>);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit');
  });

  it('forwards click handlers', () => {
    const onClick = vi.fn();
    render(<IconButton onClick={onClick}>x</IconButton>);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
