import { renderHook } from '@testing-library/preact';

import { useDebouncedCallback } from './useDebouncedCallback';

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe('useDebouncedCallback', () => {
  describe('basic debounce behaviour', () => {
    it('does not call the callback immediately on invoke', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current('arg');
      expect(cb).not.toHaveBeenCalled();
    });

    it('calls the callback after the delay has elapsed', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current('hello');
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('hello');
    });

    it('does not fire before the delay has fully elapsed', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 200));
      result.current();
      vi.advanceTimersByTime(199);
      expect(cb).not.toHaveBeenCalled();
      vi.advanceTimersByTime(1);
      expect(cb).toHaveBeenCalledOnce();
    });
  });

  describe('timer reset on repeated calls', () => {
    it('resets the timer on each call — only the last invocation fires', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));

      result.current('first');
      vi.advanceTimersByTime(50);
      result.current('second'); // resets the 100ms clock
      vi.advanceTimersByTime(50); // only 50ms since second call
      expect(cb).not.toHaveBeenCalled();

      vi.advanceTimersByTime(50); // now 100ms since second call
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('second');
    });

    it('forwards the arguments of the final call, not earlier ones', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current('a', 'b');
      result.current('c', 'd');
      result.current('e', 'f');
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('e', 'f');
    });
  });

  describe('.cancel()', () => {
    it('prevents the pending callback from firing', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current();
      result.current.cancel();
      vi.advanceTimersByTime(200);
      expect(cb).not.toHaveBeenCalled();
    });

    it('is a no-op when there is no pending call — does not throw', () => {
      const { result } = renderHook(() => useDebouncedCallback(vi.fn(), 100));
      expect(() => result.current.cancel()).not.toThrow();
    });
  });

  describe('.flush()', () => {
    it('calls the callback immediately and cancels the pending timer', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current('pending');
      result.current.flush('flushed');
      expect(cb).toHaveBeenCalledOnce();
      expect(cb).toHaveBeenCalledWith('flushed');
      // Timer that was pending should not fire a second time
      vi.advanceTimersByTime(100);
      expect(cb).toHaveBeenCalledOnce();
    });

    it('calls the callback even when there is no pending timer', () => {
      const cb = vi.fn();
      const { result } = renderHook(() => useDebouncedCallback(cb, 100));
      result.current.flush('immediate');
      expect(cb).toHaveBeenCalledWith('immediate');
    });
  });

  describe('stable callback reference — latest-callback pattern', () => {
    it('always calls the most recently rendered callback, not a stale closure', () => {
      const stale = vi.fn();
      const latest = vi.fn();
      const { result, rerender } = renderHook(
        ({ cb }) => useDebouncedCallback(cb, 100),
        { initialProps: { cb: stale } },
      );

      result.current('arg');
      rerender({ cb: latest }); // swap callback before timer fires
      vi.advanceTimersByTime(100);

      expect(stale).not.toHaveBeenCalled();
      expect(latest).toHaveBeenCalledWith('arg');
    });
  });

  describe('cleanup on unmount', () => {
    it('cancels the pending timer when the component unmounts — no memory leak or late call', () => {
      const cb = vi.fn();
      const { result, unmount } = renderHook(() =>
        useDebouncedCallback(cb, 100),
      );
      result.current('will-be-cancelled');
      unmount();
      vi.advanceTimersByTime(200);
      expect(cb).not.toHaveBeenCalled();
    });
  });

  describe('delay change', () => {
    it('returns a new debounced function when delay changes', () => {
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(vi.fn(), delay),
        { initialProps: { delay: 100 } },
      );
      const first = result.current;
      rerender({ delay: 200 });
      expect(result.current).not.toBe(first);
    });

    it('returns the same debounced function when delay is unchanged', () => {
      const cb = vi.fn();
      const { result, rerender } = renderHook(
        ({ delay }) => useDebouncedCallback(cb, delay),
        { initialProps: { delay: 100 } },
      );
      const first = result.current;
      rerender({ delay: 100 });
      expect(result.current).toBe(first);
    });
  });
});
