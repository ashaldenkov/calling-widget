import type { EventHandler, WidgetEvent, WidgetEventPayloads } from './types';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type AnyHandler = (...args: any[]) => void;

export class EventBus {
  private events = new Map<WidgetEvent, Set<AnyHandler>>();

  on<E extends WidgetEvent>(event: E, handler: EventHandler<E>): void {
    if (!this.events.has(event)) {
      this.events.set(event, new Set());
    }
    this.events.get(event)!.add(handler as AnyHandler);
  }

  off<E extends WidgetEvent>(event: E, handler: EventHandler<E>): void {
    this.events.get(event)?.delete(handler as AnyHandler);
  }

  emit<E extends WidgetEvent>(
    ...args: WidgetEventPayloads[E] extends void
      ? [event: E]
      : [event: E, payload: WidgetEventPayloads[E]]
  ): void {
    const [event, payload] = args;
    const handlers = this.events.get(event);
    if (!handlers) return;

    handlers.forEach((handler) => {
      try {
        handler(payload);
      } catch (error) {
        console.error(
          `[CallWidget] EventBus error in handler for "${event}":`,
          error,
        );
      }
    });
  }
}
