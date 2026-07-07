import { fireEvent, render } from '@testing-library/preact';

import { Radio } from './Radio';
import { RadioGroup } from './RadioGroup';

describe('RadioGroup', () => {
  it('renders children within a radiogroup role', () => {
    const { getByRole } = render(
      <RadioGroup value={null} onChange={vi.fn()}>
        <Radio name='g' value='a' />
        <Radio name='g' value='b' />
      </RadioGroup>,
    );
    const group = getByRole('radiogroup');
    expect(group.querySelectorAll('input[type="radio"]')).toHaveLength(2);
  });

  it('calls onChange with the selected radio value', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RadioGroup value={null} onChange={onChange}>
        <Radio name='g' value='a' />
        <Radio name='g' value='b' />
      </RadioGroup>,
    );
    const inputs = container.querySelectorAll<HTMLInputElement>('input');
    fireEvent.click(inputs[1]);
    expect(onChange).toHaveBeenCalledWith('b');
  });

  it('ignores change events from non-radio targets', () => {
    const onChange = vi.fn();
    const { container } = render(
      <RadioGroup value={null} onChange={onChange}>
        <input type='text' value='x' />
      </RadioGroup>,
    );
    const textInput =
      container.querySelector<HTMLInputElement>('input[type="text"]');
    fireEvent.change(textInput!, { target: { value: 'y' } });
    expect(onChange).not.toHaveBeenCalled();
  });

  it('forwards parentRef to the group element', () => {
    let node: HTMLDivElement | null = null;
    render(
      <RadioGroup
        value={null}
        onChange={vi.fn()}
        parentRef={(el) => {
          node = el;
        }}
      >
        <Radio name='g' value='a' />
      </RadioGroup>,
    );
    expect(node).not.toBeNull();
    expect(node!).toHaveClass('cw-radio-group');
  });
});
