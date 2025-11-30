import { serve } from '@hono/node-server';
import { handle } from './handle';

serve({
    fetch: handle,
    port: 8000,
    hostname: '127.0.0.1'
});
