import { Hono } from 'hono';
import { githubAuth } from '@hono/oauth-providers/github';
import { secrets } from './github-oauth/secrets';

const app = new Hono();

app.use('/', githubAuth({
  client_id: secrets.GITHUB_ID,
  client_secret: secrets.GITHUB_SECRET,
}));

app.get('/', c => {
  const token = c.get('token');
  const user = c.get('user-github');

  return c.json({
    token,
    user,
  });
});

export const githubOauthApp = app;
