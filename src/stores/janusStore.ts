import { effect, signal } from '@preact/signals';
import { deepSignal } from 'deepsignal';
import Janus from 'janus-gateway';
import adapter from 'webrtc-adapter';

import { getErrorMessage } from '../utils';

import { widgetState } from './widgetStore';

const LOG_PREFIX = '[Janus Store]';

export type JanusSession = any;

type JanusStoreState = {
  status: 'idle' | 'initializing' | 'ready' | 'error';
  session: JanusSession | null;
  error: string | null;
};

const initialState: JanusStoreState = {
  status: 'idle',
  session: null,
  error: null,
};

export const janusState = deepSignal<JanusStoreState>({ ...initialState });

let initPromise: Promise<JanusSession> | null = null;
let janusLibInitialized = false;

function ensureJanusLib(): Promise<void> {
  if (janusLibInitialized) return Promise.resolve();
  if (typeof Janus === 'undefined') {
    return Promise.reject(new Error('Janus library not available'));
  }
  return new Promise((resolve, reject) => {
    try {
      const dependencies = (Janus as any).useDefaultDependencies({ adapter });
      Janus.init({
        dependencies,
        callback: () => {
          janusLibInitialized = true;
          resolve();
        },
      });
    } catch (error) {
      reject(error);
    }
  });
}

export function getJanusSession(serverUrl: string): Promise<JanusSession> {
  if (janusState.session) {
    return Promise.resolve(janusState.session);
  }
  // for concurrent requests
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async (): Promise<JanusSession> => {
    janusState.status = 'initializing';
    janusState.session = null;
    janusState.error = null;

    try {
      await ensureJanusLib();

      return new Promise<JanusSession>((resolve, reject) => {
        const session = new Janus({
          server: serverUrl,
          success: () => {
            janusState.status = 'ready';
            janusState.session = session;
            janusState.error = null;
            resolve(session);
          },
          error: (error: any) => {
            const message = error?.message ?? 'Unknown error';
            janusState.status = 'error';
            janusState.session = null;
            janusState.error = message;
            initPromise = null;
            reject(new Error(message));
          },
        });
      });
    } catch (error) {
      const message = getErrorMessage(error);
      janusState.status = 'error';
      janusState.session = null;
      janusState.error = message;
      initPromise = null;
      throw error;
    }
  })();

  return initPromise;
}

export function destroyJanusSession(): void {
  if (janusState.session) {
    try {
      janusState.session.destroy();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error destroying session:`, error);
    }
  }
  janusState.status = initialState.status;
  janusState.session = null;
  janusState.error = null;
  initPromise = null;
}

export const janusHandle = signal<any>(null);

export function setJanusHandle(handle: any): void {
  janusHandle.value = handle;
}

export function clearJanusHandle(): void {
  janusHandle.value = null;
}

effect(() => {
  const handle = janusHandle.value;
  const muted = widgetState.isMicMuted;
  if (!handle?.webrtcStuff?.myStream) return;
  try {
    if (muted) {
      handle.muteAudio();
    } else {
      handle.unmuteAudio();
    }
  } catch (error) {
    console.error(`${LOG_PREFIX} Error setting mute:`, error);
  }
});
