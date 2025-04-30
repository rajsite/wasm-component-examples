import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { proxyApp } from './proxy';
import { jsxApp } from './jsx';
import { githubOauthApp } from './github-oauth';
import { oidcApp } from './oidc';

export const app = new Hono();

app.use(logger());

app.get('/', async c => {
  console.log('start httpbin request');
  const request = await fetch('https://httpbin.org/json');
  const result = await request.text();
  console.log('finish httpbin request');
  return c.text(`Hello World from Hono!, result: ${result}`);
});

app.route('/github-oauth', githubOauthApp);
app.route('/jsx', jsxApp);
app.route('/oidc', oidcApp);
app.route('/proxy', proxyApp);

showRoutes(app, {
  verbose: true,
});
