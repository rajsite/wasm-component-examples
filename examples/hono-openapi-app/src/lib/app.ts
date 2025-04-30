import { logger } from 'hono/logger';
import { OpenAPIHono } from '@hono/zod-openapi';
import type { BlankEnv } from 'hono/types';
import { swaggerUI } from '@hono/swagger-ui';
import { showRoutes } from 'hono/dev';
import { usersGetRoute } from './users-schema';
import { statsPostRoute } from './stats-schema';

// Recommended that the top-level app start with `OpenAPIHono`
// See: https://github.com/honojs/middleware/tree/main/packages/zod-openapi#combining-with-hono
export const app = new OpenAPIHono<BlankEnv>();
app.use(logger());

app.openapi(usersGetRoute, c => {
  const { id } = c.req.valid('param');
  return c.json({
    id,
    age: 20,
    name: 'Ultra-man',
    woa: 'df'
  });
});

app.openapi(statsPostRoute, c => {
  const { values } = c.req.valid('json');
  const sum = values.reduce((a, b) => a + b, 0);
  const mean = sum / values.length;
  const stdDev = Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / values.length);
  const max = Math.max(...values);
  const min = Math.min(...values);
  const count = values.length;
  return c.json({
    min,
    max,
    mean,
    stdDev,
    count,
  });
});

app.doc('/doc', {
  openapi: '3.0.0',
  info: {
    version: '1.0.0',
    title: 'My API',
  },
});

app.get('/', swaggerUI({ url: '/doc' }));

showRoutes(app, {
  verbose: true,
});
