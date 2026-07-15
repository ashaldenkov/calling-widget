// Module-level escape hatch so non-React code (init.ts dismiss handler,
// ExternalCallWidget end/dismiss buttons) can hang up the current call without
// wiring a ref through the tree. Populated by useMockCall while mounted.
export const hangUpRef: { current: null | (() => Promise<void>) } = {
  current: null,
};
