import type { HTMLAttributes } from 'preact';

export interface ChipProps extends Omit<
  HTMLAttributes<HTMLSpanElement>,
  'class' | 'color'
> {
  label: string;
  color?: string;
}

export const Chip = ({ label, color, style, ...rest }: ChipProps) => {
  const colorStyle = color
    ? {
        backgroundColor: `color-mix(in srgb, ${color} 20%, transparent)`,
        borderColor: color,
      }
    : undefined;
  return (
    <span
      {...rest}
      class='cw-chip cw-text-body3'
      style={{ ...colorStyle, ...(style as object) }}
    >
      {label}
    </span>
  );
};
