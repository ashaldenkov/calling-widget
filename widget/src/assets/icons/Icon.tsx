import type { ComponentChildren, SVGAttributes } from 'preact';

export interface IconProps extends SVGAttributes<SVGSVGElement> {
  size?: number | string;
}

interface InternalIconProps extends IconProps {
  children: ComponentChildren;
}

export const Icon = ({
  size = 24,
  title,
  children,
  ...rest
}: InternalIconProps) => (
  <svg
    {...rest}
    width={size}
    height={size}
    viewBox='0 0 24 24'
    fill='currentColor'
    aria-hidden={title ? undefined : true}
    role={title ? 'img' : undefined}
  >
    {title ? <title>{title}</title> : null}
    {children}
  </svg>
);
