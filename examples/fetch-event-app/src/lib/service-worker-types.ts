// To support service worker types
// See: https://github.com/microsoft/TypeScript/issues/14877
/// <reference lib="webworker" />
export const addEventListener = (globalThis as unknown as ServiceWorkerGlobalScope).addEventListener.bind(globalThis);
export type FetchListener = (this: ServiceWorkerGlobalScope, ev: ServiceWorkerGlobalScopeEventMap['fetch']) => unknown;
