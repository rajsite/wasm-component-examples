import { html } from 'hono/html';
import type { HtmlEscapedString } from 'hono/utils/html';

interface SiteData {
  title: string;
  children?: unknown;
}

const Layout = async (props: SiteData): Promise<HtmlEscapedString> => await html`<!doctype html>
    <html>
      <head>
        <title>${props.title}</title>
      </head>
      <body>
        ${props.children}
      </body>
    </html>`;

export const Content = async (props: { siteData: SiteData, name: string }): Promise<HtmlEscapedString> => (
  await <Layout {...props.siteData}>
    <h1>Hello {props.name}</h1>
  </Layout>
);
