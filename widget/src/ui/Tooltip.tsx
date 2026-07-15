import type { ComponentChildren } from 'preact';

interface TooltipProps {
  title: string;
  children: ComponentChildren;
}

export const Tooltip = ({ title, children }: TooltipProps) => (
  <span class='cw-tooltip-anchor'>
    {children}
    <span class='cw-tooltip__bubble cw-text-caption' role='tooltip'>
      {title}
    </span>
    <span class='cw-tooltip__arrow' aria-hidden='true' />
  </span>
);
