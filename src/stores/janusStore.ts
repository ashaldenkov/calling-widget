import Janus from 'janus-gateway';
import { useSyncExternalStore } from 'react';
import adapter from 'webrtc-adapter';

import { getErrorMessage } from '../utils';

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

let state: JanusStoreState = { ...initialState };
const listeners = new Set<() => void>();
let initPromise: Promise<JanusSession> | null = null;
let janusLibInitialized = false;

function emitChange() {
  listeners.forEach((listener) => listener());
}

function getSnapshot(): JanusStoreState {
  return state;
}

export function subscribe(callback: () => void): () => void {
  listeners.add(callback);
  return () => listeners.delete(callback);
}

function ensureJanusLib(): Promise<void> {
  if (janusLibInitialized) return Promise.resolve();
  if (typeof Janus === 'undefined') {
    return Promise.reject(new Error('Janus library not available'));
  }
  return new Promise((resolve, reject) => {
    try {
      const dependencies = (Janus as any).useDefaultDependencies({
        adapter,
      });
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
  if (state.session) {
    return Promise.resolve(state.session);
  }
  // for concurrent requests
  if (initPromise) {
    return initPromise;
  }

  initPromise = (async (): Promise<JanusSession> => {
    state = { status: 'initializing', session: null, error: null };
    emitChange();

    try {
      await ensureJanusLib();

      return new Promise<JanusSession>((resolve, reject) => {
        const session = new Janus({
          server: serverUrl,
          success: () => {
            state = { status: 'ready', session, error: null };
            emitChange();
            resolve(session);
          },
          error: (error: any) => {
            const message = error?.message ?? 'Unknown error';
            state = {
              status: 'error',
              session: null,
              error: message,
            };
            initPromise = null;
            emitChange();
            reject(new Error(message));
          },
        });
      });
    } catch (error) {
      const message = getErrorMessage(error);
      state = {
        status: 'error',
        session: null,
        error: message,
      };
      initPromise = null;
      emitChange();
      throw error;
    }
  })();

  return initPromise;
}

export function destroyJanusSession(): void {
  if (state.session) {
    try {
      state.session.destroy();
    } catch (error) {
      console.error(`${LOG_PREFIX} Error destroying session:`, error);
    }
    state.session = null;
  }
  state = { ...initialState };
  initPromise = null;
  emitChange();
}

export function useJanusStore(): JanusStoreState {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
