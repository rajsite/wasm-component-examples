import { handle } from './lib/handle';
import { addEventListener } from './lib/service-worker-types';

addEventListener('fetch', (event: FetchEvent): void => event.respondWith(
  handle(event.request)
));
