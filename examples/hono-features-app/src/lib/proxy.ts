import { Hono } from 'hono';
import { proxy } from 'hono/proxy';

const app = new Hono();

app.get('/:path?', async c => {
  return await proxy(`https://httpbin.org/${c.req.param('path') ?? ''}`);
});

export const proxyApp = app;
