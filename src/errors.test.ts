import {
  ERR_GENERIC,
  ERR_SESSION_EXPIRED,
  getErrorMessage,
  getFailureMessage,
  mapHttpError,
} from './errors';
import { TechnicalError } from './types/callFailure';

describe('getErrorMessage', () => {
  it('returns the error message when given an Error instance', () => {
    expect(getErrorMessage(new Error('something broke'))).toBe(
      'something broke',
    );
  });

  it('returns an empty string when Error.message is empty', () => {
    expect(getErrorMessage(new Error(''))).toBe('');
  });

  it('returns the default fallback (ERR_GENERIC) for a plain string', () => {
    expect(getErrorMessage('oops')).toBe(ERR_GENERIC);
  });

  it('returns the default fallback for null', () => {
    expect(getErrorMessage(null)).toBe(ERR_GENERIC);
  });

  it('returns the default fallback for undefined', () => {
    expect(getErrorMessage(undefined)).toBe(ERR_GENERIC);
  });

  it('returns the default fallback for a plain object (not instanceof Error)', () => {
    expect(getErrorMessage({ message: 'looks like error but is not' })).toBe(
      ERR_GENERIC,
    );
  });

  it('uses a custom fallback when provided', () => {
    expect(getErrorMessage('not an Error', 'custom fallback')).toBe(
      'custom fallback',
    );
  });

  it('custom fallback is also used for null', () => {
    expect(getErrorMessage(null, 'my fallback')).toBe('my fallback');
  });
});

describe('getFailureMessage', () => {
  it('returns the busy line message for Busy', () => {
    expect(getFailureMessage({ kind: 'Busy' })).toBe('Line busy.');
  });

  it('returns the no-answer message for NoAnswer', () => {
    expect(getFailureMessage({ kind: 'NoAnswer' })).toBe('No answer.');
  });

  it('returns a message with the cause code for ProviderError', () => {
    expect(getFailureMessage({ kind: 'ProviderError', cause: 34 })).toBe(
      'Provider error (34). Please try again.',
    );
  });

  it('looks up the correct TechnicalError string for each detail key', () => {
    const details = Object.keys(TechnicalError) as Array<
      keyof typeof TechnicalError
    >;
    for (const detail of details) {
      expect(
        getFailureMessage({ kind: 'TechnicalError', details: detail }),
      ).toBe(TechnicalError[detail]);
    }
  });
});

describe('mapHttpError', () => {
  it('passes through a short, single-line server message as-is', () => {
    expect(mapHttpError(422, 'Phone number is invalid')).toBe(
      'Phone number is invalid',
    );
  });

  it('ignores server messages >= 200 characters and falls back to status code logic', () => {
    const longMessage = 'x'.repeat(200);
    expect(mapHttpError(500, longMessage)).toBe(ERR_GENERIC);
  });

  it('ignores server messages that contain a newline (multi-line responses)', () => {
    expect(mapHttpError(500, 'first line\nsecond line')).toBe(ERR_GENERIC);
  });

  it('ignores an empty server message', () => {
    expect(mapHttpError(401, '')).toBe(ERR_SESSION_EXPIRED);
  });

  it('returns session-expired message for 401 without server message', () => {
    expect(mapHttpError(401)).toBe(ERR_SESSION_EXPIRED);
  });

  it('returns permission-denied message for 403', () => {
    expect(mapHttpError(403)).toBe(
      'You do not have permission to call this client.',
    );
  });

  it('returns generic error for unhandled status codes (e.g. 500)', () => {
    expect(mapHttpError(500)).toBe(ERR_GENERIC);
  });

  it('returns generic error for 404', () => {
    expect(mapHttpError(404)).toBe(ERR_GENERIC);
  });
});
