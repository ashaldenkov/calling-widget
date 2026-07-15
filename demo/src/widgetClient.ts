import type {
  CallParams,
  ThemeSettings,
  WidgetInitOptions,
} from '../../widget/src/types/types';

export interface CallWidgetAPI {
  emit(event: 'init', payload?: WidgetInitOptions): void;
  emit(event: 'call', payload: CallParams): void;
  emit(event: 'customize', payload: ThemeSettings): void;
  emit(event: 'dismiss'): void;
  on(event: string, handler: (payload?: unknown) => void): void;
  off(event: string, handler: (payload?: unknown) => void): void;
}

interface LoaderOptions {
  scriptUrl: string;
  config?: WidgetInitOptions;
}

declare global {
  interface Window {
    CallWidgetLoader?: {
      load: (options: LoaderOptions) => Promise<CallWidgetAPI>;
    };
  }
}

let widgetPromise: Promise<CallWidgetAPI> | null = null;

/**
 * Loads the built widget IIFE via the loader script (served from demo/public),
 * exactly like an external host site would. Cached so repeated calls reuse the
 * same widget instance.
 */
export function loadWidget(config?: WidgetInitOptions): Promise<CallWidgetAPI> {
  if (widgetPromise) return widgetPromise;

  const loader = window.CallWidgetLoader;
  if (!loader) {
    return Promise.reject(
      new Error(
        'CallWidgetLoader not found. Ensure loader.js is included and the widget is built.',
      ),
    );
  }

  widgetPromise = loader.load({ scriptUrl: './call-widget.js', config });
  return widgetPromise;
}
