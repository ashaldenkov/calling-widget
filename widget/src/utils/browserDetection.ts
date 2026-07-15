export type BrowserWarning =
  | { type: 'unsupportedBrowser'; browser: string }
  | { type: 'oldChrome'; version: number }
  | { type: 'mobileDevice' };

const MIN_CHROME_VERSION = 138;
const MIN_DESKTOP_WIDTH = 768;

export function detectBrowserWarnings(): BrowserWarning[] {
  const warnings: BrowserWarning[] = [];
  const ua = navigator.userAgent;

  const isChrome =
    /Chrome\/(\d+)/.test(ua) && !/Edg\//.test(ua) && !/OPR\//.test(ua);
  const isSafari = /Safari\//.test(ua) && !/Chrome\//.test(ua);
  const isFirefox = /Firefox\//.test(ua);

  if (isSafari) {
    warnings.push({ type: 'unsupportedBrowser', browser: 'Safari' });
  } else if (isFirefox) {
    warnings.push({ type: 'unsupportedBrowser', browser: 'Firefox' });
  } else if (isChrome) {
    const match = ua.match(/Chrome\/(\d+)/);
    if (match) {
      const version = parseInt(match[1], 10);
      if (version < MIN_CHROME_VERSION) {
        warnings.push({ type: 'oldChrome', version });
      }
    }
  } else if (!isChrome && !isSafari && !isFirefox) {
    warnings.push({ type: 'unsupportedBrowser', browser: 'your browser' });
  }

  if (window.innerWidth < MIN_DESKTOP_WIDTH) {
    warnings.push({ type: 'mobileDevice' });
  }

  return warnings;
}
