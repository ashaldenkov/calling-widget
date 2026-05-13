import type {
  ComponentChildren,
  InputHTMLAttributes,
  TextareaHTMLAttributes,
} from 'preact';
import { useId, useLayoutEffect, useRef } from 'preact/hooks';

export interface TextFieldProps
  extends Omit<
    InputHTMLAttributes<HTMLInputElement>,
    'size' | 'label' | 'multiline' | 'class'
  > {
  label?: string;
  helperText?: string;
  error?: boolean;
  startAdornment?: ComponentChildren;
  endAdornment?: ComponentChildren;
  multiline?: boolean;
  rows?: number;
  minRows?: number;
  maxRows?: number;
  fullWidth?: boolean;
}

export const TextField = ({
  label,
  helperText,
  error,
  startAdornment,
  endAdornment,
  multiline,
  rows = 1,
  minRows,
  maxRows,
  fullWidth,
  id,
  value,
  onChange,
  onInput,
  placeholder,
  disabled,
  ...rest
}: TextFieldProps) => {
  const reactId = useId();
  const inputId = id ?? reactId;
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useLayoutEffect(() => {
    if (!multiline) return;
    const el = textareaRef.current;
    if (!el) return;

    el.style.height = 'auto';

    const style = getComputedStyle(el);
    const lhRaw = style.lineHeight;
    const lineHeight = lhRaw.endsWith('px')
      ? parseFloat(lhRaw)
      : parseFloat(lhRaw) * parseFloat(style.fontSize);
    const padding =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const border =
      parseFloat(style.borderTopWidth) + parseFloat(style.borderBottomWidth);

    const min = lineHeight * (minRows ?? 1) + padding + border;
    const max = maxRows ? lineHeight * maxRows + padding + border : Infinity;

    const next = Math.min(Math.max(el.scrollHeight + border, min), max);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > max ? 'auto' : 'hidden';
  }, [multiline, value, minRows, maxRows]);

  return (
    <div
      class='cw-textfield'
      data-error={error ? '' : undefined}
      data-full-width={fullWidth ? '' : undefined}
      data-multiline={multiline ? '' : undefined}
    >
      {label ? (
        <label class='cw-textfield__label cw-text-caption' for={inputId}>
          {label}
        </label>
      ) : null}
      <div class='cw-textfield__control'>
        {startAdornment ? (
          <span class='cw-textfield__adornment'>{startAdornment}</span>
        ) : null}
        {multiline ? (
          <textarea
            {...(rest as TextareaHTMLAttributes<HTMLTextAreaElement>)}
            ref={textareaRef}
            id={inputId}
            class='cw-textfield__input'
            value={value as string | undefined}
            placeholder={placeholder}
            disabled={disabled}
            rows={minRows ?? rows}
            onInput={
              onInput as TextareaHTMLAttributes<HTMLTextAreaElement>['onInput']
            }
            onChange={
              onChange as TextareaHTMLAttributes<HTMLTextAreaElement>['onChange']
            }
          />
        ) : (
          <input
            {...rest}
            id={inputId}
            class='cw-textfield__input'
            value={value as string | number | undefined}
            placeholder={placeholder}
            disabled={disabled}
            onInput={onInput}
            onChange={onChange}
          />
        )}
        {endAdornment ? (
          <span class='cw-textfield__adornment'>{endAdornment}</span>
        ) : null}
      </div>
      {helperText ? (
        <span class='cw-textfield__helper'>{helperText}</span>
      ) : null}
    </div>
  );
};
