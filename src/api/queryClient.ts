import { QueryClient } from '@tanstack/react-query';

import { eventBus, WidgetEvent } from '../eventBus';
import { useWidgetStore } from '../stores/widgetStore';
import { getErrorMessage } from '../utils';

import { defaultMutationFn } from './defaultMutationFn';
import { defaultQueryFn } from './defaultQueryFn';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: defaultQueryFn,
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
    mutations: {
      mutationFn: defaultMutationFn,
      onError: (error: unknown) => {
        const message = getErrorMessage(error);
        console.error('[Widget] Mutation error:', error);
        // Notification-level error
        useWidgetStore.getState().setNotification(message);
        eventBus.emit(WidgetEvent.Error, { message });
      },
    },
  },
});
