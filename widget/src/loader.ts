const WIDGET_GLOBAL = 'CallWidget';

// Must match WidgetInitOptions in the widget. All fields optional.
interface LoaderConfig {
  theme?: { mode?: 'light' | 'dark' };
  webBaseUrl?: string;
}

interface CallWidgetAPI {
  emit(event: string, payload?: unknown): void;
  on(event: string, handler: (payload?: unknown) => void): void;
  off(event: string, handler: (payload?: unknown) => void): void;
}

interface LoaderOptions {
  scriptUrl: string;
  config?: LoaderConfig; // if omitted, call widget.emit('init', config) later
}

declare global {
  interface Window {
    CallWidgetLoader?: {
      load: (options: LoaderOptions) => Promise<CallWidgetAPI>;
    };
  }
}

let pending: Promise<CallWidgetAPI> | null = null;

function load(options: LoaderOptions): Promise<CallWidgetAPI> {
  const { scriptUrl, config } = options;

  if (!scriptUrl || typeof scriptUrl !== 'string') {
    return Promise.reject(
      new Error('CallWidgetLoader.load: scriptUrl is required'),
    );
  }

  const existing = window[WIDGET_GLOBAL] as CallWidgetAPI | undefined;
  if (existing) {
    if (config) {
      existing.emit('init', config);
    }
    return Promise.resolve(existing);
  }

  if (pending) return pending;

  pending = new Promise<CallWidgetAPI>((resolve, reject) => {
    const script = document.createElement('script');
    script.src = scriptUrl;
    script.async = true;

    script.onload = () => {
      const widget = window[WIDGET_GLOBAL] as CallWidgetAPI | undefined;
      if (!widget) {
        pending = null;
        reject(
          new Error(
            'CallWidgetLoader: widget did not attach to window.CallWidget',
          ),
        );
        return;
      }
      if (config) {
        widget.emit('init', config);
      }
      resolve(widget);
    };

    script.onerror = () => {
      pending = null;
      reject(
        new Error(
          'CallWidgetLoader: failed to load widget script from ' + scriptUrl,
        ),
      );
    };

    (document.head || document.documentElement).appendChild(script);
  });

  return pending;
}

(window as Window).CallWidgetLoader = { load };

export {};
