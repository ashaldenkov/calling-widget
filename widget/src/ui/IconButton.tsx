import type { ButtonHTMLAttributes } from 'preact';

export interface IconButtonProps extends Omit<
  ButtonHTMLAttributes<HTMLButtonElement>,
  'size' | 'class'
> {
  size?: 'small' | 'medium';
}

export const IconButton = ({
  size = 'medium',
  type = 'button',
  children,
  ...rest
}: IconButtonProps) => (
  <button {...rest} type={type} data-size={size} class='cw-icon-button'>
    {children}
  </button>
);
