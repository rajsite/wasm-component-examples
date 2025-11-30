import { handle } from './handle';

// Manually define FetchEvent type based on:
// https://github.com/microsoft/TypeScript/blob/v5.8.3/src/lib/webworker.generated.d.ts#L2956
// Add only fields supported by StarlingMonkey
// https://github.com/bytecodealliance/StarlingMonkey/blob/4051ee1e72b8c9ae49cc78140529fb6198992760/builtins/web/fetch/fetch_event.cpp#L375-L384
// Avoid common pattern of using webworker lib
// https://github.com/microsoft/TypeScript/issues/14877#issuecomment-2843268722
declare global {
    interface WindowEventMap {
        fetch: FetchEvent;
    }

    interface FetchEvent extends Event {
        readonly request: Request;
        respondWith(r: Response | PromiseLike<Response>): void;
        waitUntil(f: Promise<unknown>): void;
    }
}

addEventListener('fetch', e => e.respondWith(handle(e.request)));
