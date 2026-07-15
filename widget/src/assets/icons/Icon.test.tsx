import { render } from '@testing-library/preact';

import { Icon } from './Icon';

describe('Icon', () => {
  it('defaults to size 24 and is aria-hidden without a title', () => {
    const { container } = render(
      <Icon>
        <path d='M0 0h24v24H0z' />
      </Icon>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '24');
    expect(svg).toHaveAttribute('height', '24');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).not.toHaveAttribute('role');
    expect(svg?.querySelector('title')).toBeNull();
  });

  it('renders a title and img role when title is provided', () => {
    const { container } = render(
      <Icon title='Phone'>
        <path d='M0 0h24v24H0z' />
      </Icon>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('role', 'img');
    expect(svg).not.toHaveAttribute('aria-hidden');
    expect(svg?.querySelector('title')?.textContent).toBe('Phone');
  });

  it('honors a custom numeric size', () => {
    const { container } = render(
      <Icon size={16}>
        <path d='M0 0h24v24H0z' />
      </Icon>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '16');
    expect(svg).toHaveAttribute('height', '16');
  });

  it('honors a string size', () => {
    const { container } = render(
      <Icon size='2em'>
        <path d='M0 0h24v24H0z' />
      </Icon>,
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveAttribute('width', '2em');
    expect(svg).toHaveAttribute('height', '2em');
  });
});
