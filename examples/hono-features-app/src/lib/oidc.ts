import { Hono } from 'hono';
import { oidcAuthMiddleware, getAuth, revokeSession, processOAuthCallback, initOidcAuthMiddleware } from '@hono/oidc-auth';
import { secrets } from './oidc/secrets';

const app = new Hono();

app.use(initOidcAuthMiddleware({
  ...secrets,
  OIDC_REDIRECT_URI: '/oidc/callback'
}));

app.get('/logout', async c => {
  await revokeSession(c);
  return c.text('You have been successfully logged out!');
});

app.get('/callback', async c => {
  return await processOAuthCallback(c);
});

app.use('*', oidcAuthMiddleware());

app.get('/', async c => {
  const auth = await getAuth(c);
  const email = typeof auth?.email === 'string' ? auth.email : 'unknown email';
  return c.text(`Hello <${email}>!`);
});

export const oidcApp = app;
