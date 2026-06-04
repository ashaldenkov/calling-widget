import { detectBrowserWarnings } from './browserDetection';

const UA_CHROME_140 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36';
const UA_CHROME_100 =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.0.0 Safari/537.36';
const UA_SAFARI =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15';
const UA_FIREFOX =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/109.0';
const UA_EDGE =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0';
const UA_OPERA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 OPR/106.0.0.0';
const UA_UNKNOWN = 'SomeCustomBot/1.0';

function setUA(ua: string) {
  Object.defineProperty(navigator, 'userAgent', {
    value: ua,
    configurable: true,
  });
}

function setInnerWidth(width: number) {
  Object.defineProperty(window, 'innerWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
}

const originalUA = navigator.userAgent;
const DESKTOP_WIDTH = 1024;

beforeEach(() => {
  setUA(UA_CHROME_140);
  setInnerWidth(DESKTOP_WIDTH);
});

afterEach(() => {
  setUA(originalUA);
  setInnerWidth(DESKTOP_WIDTH);
});

describe('detectBrowserWarnings', () => {
  describe('supported Chrome browser', () => {
    it('returns no warnings for Chrome >= 138 on desktop', () => {
      setUA(UA_CHROME_140);
      expect(detectBrowserWarnings()).toHaveLength(0);
    });

    it('returns oldChrome warning for Chrome < 138', () => {
      setUA(UA_CHROME_100);
      const warnings = detectBrowserWarnings();
      expect(warnings).toHaveLength(1);
      expect(warnings[0]).toEqual({ type: 'oldChrome', version: 100 });
    });

    it('oldChrome warning includes the actual version number', () => {
      setUA('Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36');
      const warnings = detectBrowserWarnings();
      const chromeWarning = warnings.find((w) => w.type === 'oldChrome');
      expect(chromeWarning).toEqual({ type: 'oldChrome', version: 120 });
    });
  });

  describe('unsupported browsers', () => {
    it('warns for Safari', () => {
      setUA(UA_SAFARI);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'Safari',
      });
    });

    it('warns for Firefox', () => {
      setUA(UA_FIREFOX);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'Firefox',
      });
    });

    it('warns for Edge — has Chrome/ in UA but also Edg/, so not classified as Chrome', () => {
      setUA(UA_EDGE);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'your browser',
      });
    });

    it('warns for Opera — has Chrome/ in UA but also OPR/, so not classified as Chrome', () => {
      setUA(UA_OPERA);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'your browser',
      });
    });

    it('warns for completely unknown user agent', () => {
      setUA(UA_UNKNOWN);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'your browser',
      });
    });
  });

  describe('mobile device detection', () => {
    it('adds mobileDevice warning when viewport is narrower than 768px', () => {
      setInnerWidth(767);
      const warnings = detectBrowserWarnings();
      expect(warnings).toContainEqual({ type: 'mobileDevice' });
    });

    it('does not warn at exactly 768px (boundary is exclusive)', () => {
      setInnerWidth(768);
      const warnings = detectBrowserWarnings();
      expect(warnings.find((w) => w.type === 'mobileDevice')).toBeUndefined();
    });

    it('does not warn for desktop viewports', () => {
      setInnerWidth(1280);
      const warnings = detectBrowserWarnings();
      expect(warnings.find((w) => w.type === 'mobileDevice')).toBeUndefined();
    });
  });

  describe('warnings are additive', () => {
    it('returns both browser and mobile warnings when both conditions are met', () => {
      setUA(UA_FIREFOX);
      setInnerWidth(375);
      const warnings = detectBrowserWarnings();
      expect(warnings).toHaveLength(2);
      expect(warnings).toContainEqual({
        type: 'unsupportedBrowser',
        browser: 'Firefox',
      });
      expect(warnings).toContainEqual({ type: 'mobileDevice' });
    });
  });
});
