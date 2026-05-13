import type { ButtonHTMLAttributes, ComponentChildren } from 'preact';

type Variant = 'contained' | 'outlined' | 'text';
type Tone = 'primary' | 'secondary' | 'danger';

export interface ButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'size' | 'class'> {
  variant?: Variant;
  tone?: Tone;
  fullWidth?: boolean;
  startIcon?: ComponentChildren;
}

export const Button = ({
  variant = 'contained',
  tone = 'primary',
  fullWidth,
  startIcon,
  type = 'button',
  children,
  ...rest
}: ButtonProps) => (
  <button
    {...rest}
    type={type}
    data-variant={variant}
    data-tone={tone}
    data-full-width={fullWidth ? '' : undefined}
    class='cw-button cw-text-body4'
  >
    {startIcon ? <span class='cw-button__icon'>{startIcon}</span> : null}
    {children}
  </button>
);
