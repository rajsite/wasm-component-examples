import type { handle as Handle } from 'wasi:http/incoming-handler@0.2.3';
import { handle } from './lib/handle';
/**
 * This export represents the `wasi:http/incoming-handler` interface,
 * which describes implementing a HTTP handler in WebAssembly using WASI types.
 */
export const incomingHandler: {
  handle: typeof Handle
} = {
  handle
};
