import { h, render } from 'preact';

import { App } from './App';
import { eventBus, WidgetEvent } from './eventBus';
import { registerWidgetHandlers } from './init';
import widgetStyles from './styles/widget.css?inline';

declare const __WIDGET_VERSION__: string;

const CONTAINER_ID = 'call-widget-root';
const LOG_PREFIX = '[CallWidget]';

console.info(`${LOG_PREFIX} v${__WIDGET_VERSION__}`);

function ensureMount(): void {
  let container = document.getElementById(
    CONTAINER_ID,
  ) as HTMLDivElement | null;
  if (!container) {
    container = document.createElement('div');
    container.id = CONTAINER_ID;
    container.style.cssText =
      'position:fixed;top:0;left:0;width:100%;height:100%;z-index:1300;pointer-events:none;';
    document.body.appendChild(container);
  }

  const shadow =
    container.shadowRoot ?? container.attachShadow({ mode: 'open' });

  if (!shadow.querySelector('style[data-cw-styles]')) {
    const styleEl = document.createElement('style');
    styleEl.setAttribute('data-cw-styles', '');
    styleEl.textContent = widgetStyles;
    shadow.appendChild(styleEl);
  }

  if (!document.querySelector('link[data-cw-font]')) {
    const fontLink = document.createElement('link');
    fontLink.rel = 'stylesheet';
    fontLink.setAttribute('data-cw-font', '');
    fontLink.href =
      'https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700&display=swap';
    document.head.appendChild(fontLink);
  }

  const mountPoint = document.createElement('div');
  shadow.appendChild(mountPoint);

  render(h(App, {}), mountPoint);
}

registerWidgetHandlers(ensureMount);

declare global {
  interface Window {
    CallWidget: typeof eventBus;
  }
}

window.CallWidget = eventBus;

export { eventBus, WidgetEvent };
export type { WidgetEventPayloads, EventHandler } from './eventBus';
