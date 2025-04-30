import { Hono } from 'hono';
import { Content } from './jsx/components';

const app = new Hono();

app.get('/:name?', async c => {
  const { name } = c.req.param();
  const props = {
    name: name ?? 'unknown',
    siteData: {
      title: 'JSX with html sample',
    },
  };
  return await c.html(<Content {...props} />);
});

export const jsxApp = app;
