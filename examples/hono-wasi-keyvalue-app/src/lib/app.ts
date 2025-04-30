import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { open } from 'wasi:keyvalue/store@0.2.0-draft';

export const app = new Hono();

// Empty string bucket name is compatible with wasmtime
// String "default" is compatible with wash
const bucketName = 'default';

app.use(logger());

app.get('/', c => {
  return c.text(`
    Usage: GET /key/<key> to get the current value of a <key> and POST /key {key: "<key>", value: "<value>"} to update.
    Example GET: fetch("/key/my-key", { method: "GET" });
    Example POST: fetch("/key", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ "key":"my-key", "value":'test3' }) });
    `);
});

app.get('/key/:key', async c => {
  const key = c.req.param('key') || '';
  const kvBucket = open(bucketName);
  const kvValue = kvBucket.get(key);
  if (kvValue === undefined) {
    return await c.notFound();
  }
  const value = new TextDecoder().decode(kvValue);

  return c.json({
    key,
    value
  });
});

app.post('/key', async c => {
  const kvBucket = open(bucketName);
  const body: unknown = await c.req.json();
  if (!(typeof body === 'object'
    && body
    && 'key' in body
    && typeof body.key === 'string'
    && 'value' in body
    && typeof body.value === 'string'
  )) {
    return await c.notFound();
  }
  const { key, value } = body;
  const valueBin = new TextEncoder().encode(value);
  kvBucket.set(key, valueBin);

  return c.json({
    key,
    value
  });
});

showRoutes(app, {
  verbose: true,
});
