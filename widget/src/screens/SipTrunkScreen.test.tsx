import { act, fireEvent, render, screen } from '@testing-library/preact';

vi.mock('../utils/micPermission', () => ({
  probeMicPermission: vi.fn().mockResolvedValue('granted'),
}));

import { eventBus, WidgetEvent } from '../eventBus';
import { setCallParams, widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import type { TrunkListItem } from '../types/types';

import SipTrunkScreen from './SipTrunkScreen';

const trunks: TrunkListItem[] = [
  {
    id: '1000',
    brandId: 'b1',
    name: 'US East — New York',
    isDefault: true,
    status: 'active',
    enabled: true,
    minuteCost: 0.008,
  },
  {
    id: '2000',
    brandId: 'b1',
    name: 'Global — Anycast Primary',
    isDefault: false,
    status: 'active',
    enabled: true,
    minuteCost: 0.03,
  },
];

beforeEach(() => {
  resetWidgetState();
  setCallParams({
    customer: {
      id: 'cust-1',
      firstName: 'Emily',
      lastName: 'Carter',
      country: 'US',
      status: null,
    },
    trunks,
  });
});

describe('SipTrunkScreen (host-provided trunks)', () => {
  it('renders the trunks passed by the host', () => {
    render(<SipTrunkScreen onConfirm={vi.fn()} onCancel={vi.fn()} />);
    expect(screen.getByText('US East — New York')).toBeInTheDocument();
    expect(screen.getByText('Global — Anycast Primary')).toBeInTheDocument();
  });

  it('confirming selects the trunk, emits trunk_selected and calls onConfirm', async () => {
    const onConfirm = vi.fn().mockResolvedValue(undefined);
    const spy = vi.spyOn(eventBus, 'emit');
    render(<SipTrunkScreen onConfirm={onConfirm} onCancel={vi.fn()} />);

    // Open the confirmation dialog (screen action = first Confirm), then confirm
    // inside the dialog (last Confirm).
    fireEvent.click(screen.getAllByText('Confirm')[0]);
    await act(async () => {
      const confirmButtons = screen.getAllByText('Confirm');
      fireEvent.click(confirmButtons[confirmButtons.length - 1]);
      // Flush the async handleCallConfirm (mic probe + onConfirm).
      await Promise.resolve();
    });

    expect(spy).toHaveBeenCalledWith(WidgetEvent.TrunkSelected, {
      trunkId: '1000',
      trunkName: 'US East — New York',
    });
    expect(onConfirm).toHaveBeenCalledWith('1000');
    expect(widgetState.selectedTrunkId).toBe('1000');
  });
});
