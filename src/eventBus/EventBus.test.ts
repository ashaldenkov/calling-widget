import { EventBus } from './EventBus';
import { WidgetEvent } from './types';

describe('EventBus', () => {
  let bus: EventBus;

  beforeEach(() => {
    bus = new EventBus();
  });

  it('calls registered handler when event is emitted', () => {
    const handler = vi.fn();
    bus.on(WidgetEvent.Initialized, handler);
    bus.emit(WidgetEvent.Initialized);
    expect(handler).toHaveBeenCalledOnce();
  });

  it('passes payload to handler', () => {
    const handler = vi.fn();
    bus.on(WidgetEvent.Error, handler);
    bus.emit(WidgetEvent.Error, { message: 'boom' });
    expect(handler).toHaveBeenCalledWith({ message: 'boom' });
  });

  it('calls all registered handlers for the same event', () => {
    const h1 = vi.fn();
    const h2 = vi.fn();
    bus.on(WidgetEvent.Initialized, h1);
    bus.on(WidgetEvent.Initialized, h2);
    bus.emit(WidgetEvent.Initialized);
    expect(h1).toHaveBeenCalledOnce();
    expect(h2).toHaveBeenCalledOnce();
  });

  it('does not call handler after off()', () => {
    const handler = vi.fn();
    bus.on(WidgetEvent.Initialized, handler);
    bus.off(WidgetEvent.Initialized, handler);
    bus.emit(WidgetEvent.Initialized);
    expect(handler).not.toHaveBeenCalled();
  });

  it('does not throw when emitting an event with no handlers', () => {
    expect(() => bus.emit(WidgetEvent.Initialized)).not.toThrow();
  });

  it('isolates errors — other handlers still run if one throws', () => {
    const throwing = vi.fn(() => {
      throw new Error('handler error');
    });
    const safe = vi.fn();
    bus.on(WidgetEvent.Initialized, throwing);
    bus.on(WidgetEvent.Initialized, safe);
    expect(() => bus.emit(WidgetEvent.Initialized)).not.toThrow();
    expect(safe).toHaveBeenCalledOnce();
  });

  it('does not call handlers for other events', () => {
    const handler = vi.fn();
    bus.on(WidgetEvent.Initialized, handler);
    bus.emit(WidgetEvent.WidgetDismissed);
    expect(handler).not.toHaveBeenCalled();
  });
});
