import { fireEvent, render, screen } from '@testing-library/preact';

import { eventBus, WidgetEvent } from '../eventBus';
import { widgetState } from '../stores/widgetStore';
import { resetWidgetState } from '../test/resetWidgetState';
import { CallState } from '../types/types';

import MuteButton, { MuteIconButton } from './MuteButton';

beforeEach(() => {
  resetWidgetState();
});

describe('MuteButton', () => {
  describe('label reflects mute state', () => {
    it('shows "Mute" when mic is not muted', () => {
      widgetState.callState = CallState.Connected;
      render(<MuteButton />);
      expect(screen.getByRole('button')).toHaveTextContent('Mute');
    });

    it('shows "Unmute" when mic is already muted', () => {
      widgetState.callState = CallState.Connected;
      widgetState.isMicMuted = true;
      render(<MuteButton />);
      expect(screen.getByRole('button')).toHaveTextContent('Unmute');
    });
  });

  describe('disabled conditions — mic control locked when call is not active', () => {
    it('is disabled when callState is Idle', () => {
      widgetState.callState = CallState.Idle;
      render(<MuteButton />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when callState is Failed', () => {
      widgetState.callState = CallState.Failed;
      render(<MuteButton />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is disabled when callState is Ended', () => {
      widgetState.callState = CallState.Ended;
      render(<MuteButton />);
      expect(screen.getByRole('button')).toBeDisabled();
    });

    it('is enabled when callState is Connected', () => {
      widgetState.callState = CallState.Connected;
      render(<MuteButton />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });

    it('is enabled when callState is Calling', () => {
      widgetState.callState = CallState.Calling;
      render(<MuteButton />);
      expect(screen.getByRole('button')).not.toBeDisabled();
    });
  });

  describe('toggle behaviour', () => {
    it('mutes the mic and emits MicToggled{muted:true} when clicked while unmuted', () => {
      widgetState.callState = CallState.Connected;
      const spy = vi.spyOn(eventBus, 'emit');
      render(<MuteButton />);
      fireEvent.click(screen.getByRole('button'));
      expect(widgetState.isMicMuted).toBe(true);
      expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, { muted: true });
    });

    it('unmutes the mic and emits MicToggled{muted:false} when clicked while muted', () => {
      widgetState.callState = CallState.Connected;
      widgetState.isMicMuted = true;
      const spy = vi.spyOn(eventBus, 'emit');
      render(<MuteButton />);
      fireEvent.click(screen.getByRole('button'));
      expect(widgetState.isMicMuted).toBe(false);
      expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, {
        muted: false,
      });
    });
  });
});

describe('MuteIconButton', () => {
  it('is disabled when callState is Idle', () => {
    widgetState.callState = CallState.Idle;
    render(<MuteIconButton />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('is enabled when callState is Connected', () => {
    widgetState.callState = CallState.Connected;
    render(<MuteIconButton />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('mutes and emits MicToggled when clicked', () => {
    widgetState.callState = CallState.Connected;
    const spy = vi.spyOn(eventBus, 'emit');
    render(<MuteIconButton />);
    fireEvent.click(screen.getByRole('button'));
    expect(widgetState.isMicMuted).toBe(true);
    expect(spy).toHaveBeenCalledWith(WidgetEvent.MicToggled, { muted: true });
  });
});
