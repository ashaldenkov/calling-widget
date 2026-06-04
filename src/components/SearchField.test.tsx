import { fireEvent, render, screen } from '@testing-library/preact';

import SearchField from './SearchField';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('SearchField', () => {
  describe('rendering', () => {
    it('shows the default "Search" placeholder', () => {
      render(<SearchField onChange={vi.fn()} />);
      expect(screen.getByPlaceholderText('Search')).toBeInTheDocument();
    });

    it('accepts a custom placeholder', () => {
      render(<SearchField onChange={vi.fn()} placeholder='Find trunk' />);
      expect(screen.getByPlaceholderText('Find trunk')).toBeInTheDocument();
    });

    it('does not render a clear button when the input is empty', () => {
      render(<SearchField onChange={vi.fn()} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });

  describe('debounced onChange (default 250 ms)', () => {
    it('does not call onChange immediately after input', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} />);
      fireEvent.input(screen.getByPlaceholderText('Search'), {
        target: { value: 'hello' },
      });
      expect(onChange).not.toHaveBeenCalled();
    });

    it('calls onChange with the typed value once the delay elapses', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} />);
      fireEvent.input(screen.getByPlaceholderText('Search'), {
        target: { value: 'hello' },
      });
      expect(onChange).not.toHaveBeenCalled();
      vi.advanceTimersByTime(250);
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith('hello');
    });

    it('coalesces rapid inputs — fires once with the latest value only', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} />);
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'a' } });
      vi.advanceTimersByTime(100);
      fireEvent.input(input, { target: { value: 'ab' } });
      vi.advanceTimersByTime(250);
      expect(onChange).toHaveBeenCalledOnce();
      expect(onChange).toHaveBeenCalledWith('ab');
    });
  });

  describe('debounceMs=0 (used by SipTrunkScreen for instant client-side filtering)', () => {
    it('calls onChange synchronously on every input event — no wait', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} debounceMs={0} />);
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'a' } });
      fireEvent.input(input, { target: { value: 'ab' } });
      fireEvent.input(input, { target: { value: 'abc' } });
      expect(onChange).toHaveBeenCalledTimes(3);
      expect(onChange).toHaveBeenLastCalledWith('abc');
    });
  });

  describe('clear button', () => {
    it('appears only after the user has typed something', () => {
      render(<SearchField onChange={vi.fn()} />);
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
      fireEvent.input(screen.getByPlaceholderText('Search'), {
        target: { value: 'x' },
      });
      expect(screen.getByRole('button')).toBeInTheDocument();
    });

    it('resets the input value to empty when clicked', () => {
      render(<SearchField onChange={vi.fn()} debounceMs={0} />);
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'foo' } });
      fireEvent.click(screen.getByRole('button'));
      expect(input).toHaveValue('');
    });

    it('immediately flushes onChange("") even when a debounce is still pending', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} />); // 250 ms debounce
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'foo' } });
      expect(onChange).not.toHaveBeenCalled(); // pending
      fireEvent.click(screen.getByRole('button')); // flush
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('calls onChange("") immediately when debounceMs=0', () => {
      const onChange = vi.fn();
      render(<SearchField onChange={onChange} debounceMs={0} />);
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'foo' } });
      onChange.mockClear();
      fireEvent.click(screen.getByRole('button'));
      expect(onChange).toHaveBeenCalledWith('');
    });

    it('disappears after clearing — the field is empty again', () => {
      render(<SearchField onChange={vi.fn()} debounceMs={0} />);
      const input = screen.getByPlaceholderText('Search');
      fireEvent.input(input, { target: { value: 'x' } });
      fireEvent.click(screen.getByRole('button'));
      expect(screen.queryByRole('button')).not.toBeInTheDocument();
    });
  });
});
