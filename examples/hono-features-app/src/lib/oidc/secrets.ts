import type { OidcAuthEnv } from '@hono/oidc-auth';

declare let process: {
  env: {
    [key: string]: string
  }
};

// Secrets will be replaced at build with contents
// of .env or .env.local from project root
export const secrets: OidcAuthEnv = {
  OIDC_AUTH_SECRET: process.env.OIDC_AUTH_SECRET,
  OIDC_ISSUER: process.env.OIDC_ISSUER,
  OIDC_CLIENT_ID: process.env.OIDC_CLIENT_ID,
  OIDC_CLIENT_SECRET: process.env.OIDC_CLIENT_SECRET
};
