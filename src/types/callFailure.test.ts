import { reasonFromQ850 } from './callFailure';

describe('reasonFromQ850', () => {
  describe('returns null for non-failure causes', () => {
    it('returns null for Q850 normal hangup (16)', () => {
      expect(reasonFromQ850(16)).toBeNull();
    });

    it('returns null for 0 — zero is not a valid cause code', () => {
      expect(reasonFromQ850(0)).toBeNull();
    });

    it('returns null for negative numbers', () => {
      expect(reasonFromQ850(-1)).toBeNull();
      expect(reasonFromQ850(-100)).toBeNull();
    });

    it('returns null for cause > 127 (above Q850 range)', () => {
      expect(reasonFromQ850(128)).toBeNull();
      expect(reasonFromQ850(999)).toBeNull();
    });

    it('returns null for non-numeric strings', () => {
      expect(reasonFromQ850('abc')).toBeNull();
      expect(reasonFromQ850('')).toBeNull();
    });

    it('returns null for null and undefined', () => {
      expect(reasonFromQ850(null)).toBeNull();
      expect(reasonFromQ850(undefined)).toBeNull();
    });

    it('returns null for NaN', () => {
      expect(reasonFromQ850(NaN)).toBeNull();
    });
  });

  describe('maps standard Q850 codes to typed reasons', () => {
    it('maps 17 to Busy', () => {
      expect(reasonFromQ850(17)).toEqual({ kind: 'Busy' });
    });

    it('maps 18 to NoAnswer', () => {
      expect(reasonFromQ850(18)).toEqual({ kind: 'NoAnswer' });
    });

    it('maps 19 to NoAnswer', () => {
      expect(reasonFromQ850(19)).toEqual({ kind: 'NoAnswer' });
    });

    it('maps 20 to NoAnswer', () => {
      expect(reasonFromQ850(20)).toEqual({ kind: 'NoAnswer' });
    });

    it('maps other valid codes (e.g. 1, 21, 127) to ProviderError with the cause number', () => {
      expect(reasonFromQ850(1)).toEqual({ kind: 'ProviderError', cause: 1 });
      expect(reasonFromQ850(21)).toEqual({ kind: 'ProviderError', cause: 21 });
      expect(reasonFromQ850(127)).toEqual({
        kind: 'ProviderError',
        cause: 127,
      });
    });
  });

  describe('parses cause from non-integer inputs', () => {
    it('parses a numeric string the same as the number', () => {
      expect(reasonFromQ850('17')).toEqual({ kind: 'Busy' });
      expect(reasonFromQ850('18')).toEqual({ kind: 'NoAnswer' });
    });

    it('truncates floats via parseInt before classification', () => {
      // parseInt('17.9') === 17 → Busy
      expect(reasonFromQ850('17.9')).toEqual({ kind: 'Busy' });
      // parseInt('16.5') === 16 → normal hangup → null
      expect(reasonFromQ850('16.5')).toBeNull();
    });
  });
});
