import { fireEvent, render } from '@testing-library/preact';

const useRefMock = vi.hoisted(() =>
  vi.fn<() => { current: unknown } | undefined>(),
);

vi.mock('preact/hooks', async (importOriginal) => {
  const actual = await importOriginal<typeof import('preact/hooks')>();
  return {
    ...actual,
    useRef: <T,>(init: T) => useRefMock() ?? actual.useRef<T>(init),
  };
});

import { TextField } from './TextField';

beforeEach(() => {
  // by default, defer to the real useRef
  useRefMock.mockReturnValue(undefined);
});

describe('TextField', () => {
  it('renders a single-line input by default', () => {
    const { container } = render(<TextField placeholder='Name' />);
    const input = container.querySelector('input');
    expect(input).toBeInTheDocument();
    expect(container.querySelector('textarea')).toBeNull();
    expect(container.querySelector('.cw-textfield')).not.toHaveAttribute(
      'data-multiline',
    );
  });

  it('associates the label with the input via a generated id', () => {
    const { container } = render(<TextField label='Full name' />);
    const label = container.querySelector('label');
    const input = container.querySelector('input');
    expect(label).toHaveTextContent('Full name');
    expect(label?.getAttribute('for')).toBe(input?.id);
    expect(input?.id).toBeTruthy();
  });

  it('uses an explicit id when provided', () => {
    const { container } = render(<TextField label='X' id='my-field' />);
    expect(container.querySelector('input')?.id).toBe('my-field');
    expect(container.querySelector('label')?.getAttribute('for')).toBe(
      'my-field',
    );
  });

  it('renders helperText and the error state', () => {
    const { container } = render(<TextField helperText='Required' error />);
    expect(container.querySelector('.cw-textfield__helper')).toHaveTextContent(
      'Required',
    );
    expect(container.querySelector('.cw-textfield')).toHaveAttribute(
      'data-error',
      '',
    );
  });

  it('does not render a label or helper when omitted', () => {
    const { container } = render(<TextField />);
    expect(container.querySelector('label')).toBeNull();
    expect(container.querySelector('.cw-textfield__helper')).toBeNull();
  });

  it('renders start and end adornments', () => {
    const { getByText } = render(
      <TextField
        startAdornment={<span>start</span>}
        endAdornment={<span>end</span>}
      />,
    );
    expect(getByText('start')).toBeInTheDocument();
    expect(getByText('end')).toBeInTheDocument();
  });

  it('sets data-full-width when fullWidth is set', () => {
    const { container } = render(<TextField fullWidth />);
    expect(container.querySelector('.cw-textfield')).toHaveAttribute(
      'data-full-width',
      '',
    );
  });

  it('fires onInput and onChange on a single-line input', () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <TextField onInput={onInput} onChange={onChange} />,
    );
    const input = container.querySelector('input')!;
    fireEvent.input(input, { target: { value: 'a' } });
    fireEvent.change(input, { target: { value: 'a' } });
    expect(onInput).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
  });

  it('renders a textarea when multiline and applies data-multiline', () => {
    const { container } = render(<TextField multiline value='hello' />);
    expect(container.querySelector('textarea')).toBeInTheDocument();
    expect(container.querySelector('input')).toBeNull();
    expect(container.querySelector('.cw-textfield')).toHaveAttribute(
      'data-multiline',
      '',
    );
  });

  it('fires onInput and onChange on a multiline textarea', () => {
    const onInput = vi.fn();
    const onChange = vi.fn();
    const { container } = render(
      <TextField multiline onInput={onInput} onChange={onChange} />,
    );
    const textarea = container.querySelector('textarea')!;
    fireEvent.input(textarea, { target: { value: 'x' } });
    fireEvent.change(textarea, { target: { value: 'x' } });
    expect(onInput).toHaveBeenCalled();
    expect(onChange).toHaveBeenCalled();
  });

  it('sets textarea height based on scrollHeight when multiline (px lineHeight)', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '20px',
      fontSize: '16px',
      paddingTop: '4px',
      paddingBottom: '4px',
      borderTopWidth: '1px',
      borderBottomWidth: '1px',
    } as unknown as CSSStyleDeclaration);
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 100,
    });
    try {
      const { container } = render(
        <TextField multiline minRows={2} maxRows={5} value='line' />,
      );
      const textarea = container.querySelector('textarea')!;
      // scrollHeight(100) + border(2) = 102, clamped within [min, max]
      expect(textarea.style.height).toBe('102px');
      expect(textarea.style.overflowY).toBe('hidden');
    } finally {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });

  it('clamps to maxRows and enables scrolling when content overflows', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '20px',
      fontSize: '16px',
      paddingTop: '0px',
      paddingBottom: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    } as unknown as CSSStyleDeclaration);
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 500,
    });
    try {
      const { container } = render(
        <TextField multiline maxRows={2} value='many lines' />,
      );
      const textarea = container.querySelector('textarea')!;
      // max = 20 * 2 = 40, scrollHeight(500) > max -> clamp to 40, overflow auto
      expect(textarea.style.height).toBe('40px');
      expect(textarea.style.overflowY).toBe('auto');
    } finally {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });

  it('bails out of the resize effect when the textarea ref is null', () => {
    // Force textareaRef.current to stay null so the effect returns early,
    // even after Preact tries to attach the DOM node to the ref.
    const nullRef = Object.defineProperty(
      {} as { current: unknown },
      'current',
      {
        get: () => null,
        set: () => undefined,
      },
    );
    useRefMock.mockReturnValueOnce(nullRef);
    const getStyleSpy = vi.spyOn(window, 'getComputedStyle');
    const { container } = render(<TextField multiline value='x' />);
    // textarea still renders, but the sizing logic never ran
    expect(container.querySelector('textarea')).toBeInTheDocument();
    expect(getStyleSpy).not.toHaveBeenCalled();
  });

  it('handles a unitless (em) lineHeight and no maxRows', () => {
    vi.spyOn(window, 'getComputedStyle').mockReturnValue({
      lineHeight: '1.5',
      fontSize: '16px',
      paddingTop: '0px',
      paddingBottom: '0px',
      borderTopWidth: '0px',
      borderBottomWidth: '0px',
    } as unknown as CSSStyleDeclaration);
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: () => 10,
    });
    try {
      const { container } = render(
        <TextField multiline minRows={3} value='x' />,
      );
      const textarea = container.querySelector('textarea')!;
      // lineHeight = 1.5 * 16 = 24; min = 24 * 3 = 72; scrollHeight(10) < min
      expect(textarea.style.height).toBe('72px');
      // max is Infinity -> not overflowing
      expect(textarea.style.overflowY).toBe('hidden');
    } finally {
      delete (HTMLElement.prototype as { scrollHeight?: number }).scrollHeight;
    }
  });
});
