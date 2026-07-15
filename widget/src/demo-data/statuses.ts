import type { StatusOption, StatusesResponse } from '../types/types';

/**
 * Default dialer statuses used when the host does not pass its own list via the
 * `call` event. This is a backendless demo — statuses live in memory only.
 */
export const DEMO_STATUSES: StatusOption[] = [
  { id: 's1', name: 'New', color: '#1976d2' },
  { id: 's2', name: 'Interested', color: '#2e7d32' },
  { id: 's3', name: 'Callback scheduled', color: '#ed6c02' },
  { id: 's4', name: 'Not interested', color: '#d32f2f' },
  { id: 's5', name: 'Voicemail', color: '#7b1fa2' },
  { id: 's6', name: 'Wrong number', color: '#616161' },
  { id: 's7', name: 'Do not call', color: '#c2185b' },
  { id: 's8', name: 'Deal won', color: '#388e3c' },
  { id: 's9', name: 'Deal lost', color: '#b71c1c' },
  { id: 's10', name: 'Follow up', color: '#0288d1' },
  { id: 's11', name: 'No answer', color: '#795548' },
  { id: 's12', name: 'Busy', color: '#f57c00' },
  { id: 's13', name: 'Language barrier', color: '#5d4037' },
  { id: 's14', name: 'Under review', color: '#455a64' },
  { id: 's15', name: 'Qualified lead', color: '#00897b' },
];

/**
 * Client-side paginator that mimics the old paginated `/statuses` endpoint.
 * Resolves after a short delay to imitate network latency.
 */
export function paginateStatuses(
  source: StatusOption[],
  { page, perPage, search }: { page: number; perPage: number; search?: string },
): Promise<StatusesResponse> {
  const term = (search ?? '').trim().toLowerCase();
  const filtered = term
    ? source.filter((s) => s.name.toLowerCase().includes(term))
    : source;

  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  const start = (page - 1) * perPage;
  const items = filtered.slice(start, start + perPage);

  const response: StatusesResponse = {
    items,
    pageInfo: {
      page,
      perPage,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
    },
  };

  return new Promise((resolve) => setTimeout(() => resolve(response), 250));
}
