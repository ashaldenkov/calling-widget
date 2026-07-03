import { fireEvent, render } from '@testing-library/preact';
import { createRef } from 'preact';

import CommentField, { type CommentFieldHandle } from './CommentField';

const getTextarea = (container: Element) =>
  container.querySelector('textarea') as HTMLTextAreaElement;

describe('CommentField', () => {
  it('exposes the typed value via the imperative getValue handle', () => {
    const ref = createRef<CommentFieldHandle>();
    const { container } = render(
      <CommentField ref={ref} maxLength={10} onValidityChange={vi.fn()} />,
    );

    fireEvent.input(getTextarea(container), { target: { value: 'hello' } });

    expect(ref.current?.getValue()).toBe('hello');
  });

  it('does not report invalidity while text stays within maxLength', () => {
    const onValidityChange = vi.fn();
    const { container } = render(
      <CommentField maxLength={10} onValidityChange={onValidityChange} />,
    );

    fireEvent.input(getTextarea(container), { target: { value: 'short' } });

    expect(onValidityChange).not.toHaveBeenCalledWith(true);
  });

  it('fires onValidityChange(true) once and shows helper text when text exceeds maxLength', () => {
    const onValidityChange = vi.fn();
    const { container, getByText } = render(
      <CommentField maxLength={3} onValidityChange={onValidityChange} />,
    );

    fireEvent.input(getTextarea(container), { target: { value: 'toolong' } });

    expect(onValidityChange).toHaveBeenCalledWith(true);
    expect(
      onValidityChange.mock.calls.filter(([v]) => v === true),
    ).toHaveLength(1);
    expect(getByText('Too long')).toBeInTheDocument();
  });

  it('fires validity changes only on transitions, not on every keystroke', () => {
    const onValidityChange = vi.fn();
    const { container } = render(
      <CommentField maxLength={3} onValidityChange={onValidityChange} />,
    );
    const textarea = getTextarea(container);

    // within limit -> no transition yet
    fireEvent.input(textarea, { target: { value: 'ok' } });
    fireEvent.input(textarea, { target: { value: 'abc' } });
    expect(onValidityChange).not.toHaveBeenCalled();

    // cross over the limit -> true (transition 1)
    fireEvent.input(textarea, { target: { value: 'abcd' } });
    fireEvent.input(textarea, { target: { value: 'abcde' } });
    expect(onValidityChange).toHaveBeenCalledTimes(1);
    expect(onValidityChange).toHaveBeenLastCalledWith(true);

    // back under the limit -> false (transition 2)
    fireEvent.input(textarea, { target: { value: 'ab' } });
    expect(onValidityChange).toHaveBeenCalledTimes(2);
    expect(onValidityChange).toHaveBeenLastCalledWith(false);
  });
});
