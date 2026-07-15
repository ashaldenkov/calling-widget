import { DEMO_STATUSES } from '../demo-data/statuses';
import { eventBus, WidgetEvent } from '../eventBus';
import { resetWidgetState } from '../test/resetWidgetState';
import { CallState, type CallParams } from '../types/types';

import {
  applyTheme,
  resetToIdle,
  setCallParams,
  setInitOptions,
  setMicMuted,
  setScreen,
  setThemeMode,
  widgetState,
} from './widgetStore';

const sampleCall: CallParams = {
  customer: {
    id: 'cust-1',
    firstName: 'Emily',
    lastName: 'Carter',
    country: 'US',
    status: null,
    brandName: 'Northwind',
  },
  trunks: [
    {
      id: '1000',
      brandId: 'b1',
      name: 'US East',
      isDefault: true,
      status: 'active',
      enabled: true,
      minuteCost: 0.01,
    },
  ],
};

beforeEach(() => {
  resetWidgetState();
});

describe('widgetStore (backendless)', () => {
  it('defaults statuses to the bundled DEMO_STATUSES', () => {
    expect(widgetState.statuses).toEqual(DEMO_STATUSES);
  });

  it('setCallParams stores host-provided customer + trunks', () => {
    setCallParams(sampleCall);
    expect(widgetState.customerData?.id).toBe('cust-1');
    expect(widgetState.trunks).toHaveLength(1);
    expect(widgetState.statuses).toEqual(DEMO_STATUSES);
  });

  it('setCallParams uses host statuses when provided', () => {
    const statuses = [{ id: 'x', name: 'Custom', color: '#000' }];
    setCallParams({ ...sampleCall, statuses });
    expect(widgetState.statuses).toEqual(statuses);
  });

  it('setInitOptions applies the initial theme mode', () => {
    setInitOptions({ theme: { mode: 'dark' } });
    expect(widgetState.themeMode).toBe('dark');
  });

  it('applyTheme / setThemeMode change the theme mode', () => {
    setThemeMode('dark');
    expect(widgetState.themeMode).toBe('dark');
    applyTheme({ mode: 'light' });
    expect(widgetState.themeMode).toBe('light');
  });

  it('setMicMuted emits MicToggled only on change', () => {
    const spy = vi.spyOn(eventBus, 'emit');
    setMicMuted(true);
    setMicMuted(true);
    expect(spy).toHaveBeenCalledTimes(1);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, { muted: true });
  });

  it('resetToIdle keeps initOptions + themeMode and emits WidgetDismissed', () => {
    setInitOptions({ theme: { mode: 'dark' }, webBaseUrl: 'https://x' });
    setCallParams(sampleCall);
    setScreen('sipTrunk');
    const spy = vi.spyOn(eventBus, 'emit');

    resetToIdle();

    expect(widgetState.screen).toBe('idle');
    expect(widgetState.callState).toBe(CallState.Idle);
    expect(widgetState.customerData).toBeNull();
    expect(widgetState.themeMode).toBe('dark');
    expect(widgetState.initOptions?.webBaseUrl).toBe('https://x');
    expect(spy).toHaveBeenCalledWith(WidgetEvent.WidgetDismissed);
  });
});
