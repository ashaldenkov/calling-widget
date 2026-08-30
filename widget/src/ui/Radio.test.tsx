import { render } from '@testing-library/preact';

import { Radio } from './Radio';

describe('Radio', () => {
  it('renders a checked radio with data-checked set', () => {
    const { container } = render(<Radio name='group' value='a' checked />);
    const wrapper = container.querySelector('.cw-radio');
    const input = container.querySelector<HTMLInputElement>('input');
    expect(wrapper).toHaveAttribute('data-checked', '');
    expect(input?.checked).toBe(true);
    expect(input?.type).toBe('radio');
  });

  it('renders an unchecked radio without data-checked', () => {
    const { container } = render(<Radio name='group' value='b' />);
    const wrapper = container.querySelector('.cw-radio');
    const input = container.querySelector<HTMLInputElement>('input');
    expect(wrapper).not.toHaveAttribute('data-checked');
    expect(input?.checked).toBe(false);
  });

  it('renders a disabled radio with data-disabled set', () => {
    const { container } = render(<Radio name='group' value='c' disabled />);
    const wrapper = container.querySelector('.cw-radio');
    const input = container.querySelector<HTMLInputElement>('input');
    expect(wrapper).toHaveAttribute('data-disabled', '');
    expect(input?.disabled).toBe(true);
  });

  it('is enabled by default (no data-disabled)', () => {
    const { container } = render(<Radio name='group' value='d' />);
    expect(container.querySelector('.cw-radio')).not.toHaveAttribute(
      'data-disabled',
    );
  });
});
