import type { ComponentChildren, Ref } from 'preact';

interface RadioGroupProps {
  value: string | null;
  onChange: (value: string) => void;
  children: ComponentChildren;
  parentRef?: Ref<HTMLDivElement>;
}

export const RadioGroup = ({
  value: _value,
  onChange,
  children,
  parentRef,
}: RadioGroupProps) => (
  <div
    ref={parentRef}
    class='cw-radio-group'
    role='radiogroup'
    onChange={(e) => {
      const target = e.target as HTMLInputElement | null;
      if (target?.type === 'radio') onChange(target.value);
    }}
  >
    {children}
  </div>
);
