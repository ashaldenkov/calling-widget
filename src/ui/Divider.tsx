import type { HTMLAttributes } from 'preact';

export interface DividerProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'class'> {
  orientation?: 'horizontal' | 'vertical';
}

export const Divider = ({
  orientation = 'horizontal',
  ...rest
}: DividerProps) => (
  <div
    {...rest}
    role='separator'
    aria-orientation={orientation}
    data-orientation={orientation}
    class='cw-divider'
  />
);
