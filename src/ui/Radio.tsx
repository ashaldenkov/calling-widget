import type { InputHTMLAttributes } from 'preact';

export interface RadioProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'type' | 'size' | 'class'
  > {
  checked?: boolean;
  value: string;
  name: string;
}

export const Radio = ({
  checked,
  value,
  name,
  disabled,
  ...rest
}: RadioProps) => (
  <span
    class='cw-radio'
    data-checked={checked ? '' : undefined}
    data-disabled={disabled ? '' : undefined}
  >
    <input
      {...rest}
      type='radio'
      class='cw-radio__input'
      name={name}
      value={value}
      checked={checked}
      disabled={disabled}
    />
    <span class='cw-radio__dot' aria-hidden='true' />
  </span>
);
