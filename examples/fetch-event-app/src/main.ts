import { handle } from './lib/handle';

// Manually define FetchEvent types based on:
// https://github.com/microsoft/TypeScript/blob/v5.8.3/src/lib/webworker.generated.d.ts#L2956
// See: https://github.com/microsoft/TypeScript/issues/14877#issuecomment-2843268722
declare global {
  interface WindowEventMap {
    fetch: FetchEvent;
  }
}

interface FetchEvent extends Event {
  readonly request: Request;
  readonly resultingClientId: string;
  respondWith(r: Response | PromiseLike<Response>): void;
}

addEventListener('fetch', e => e.respondWith(handle(e.request)));
