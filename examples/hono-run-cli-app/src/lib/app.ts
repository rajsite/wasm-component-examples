import { Hono } from 'hono';
import { showRoutes } from 'hono/dev';
import { logger } from 'hono/logger';
import { _setFileData } from '@bytecodealliance/preview2-shim/filesystem';

export const app = new Hono();

app.use(logger());

app.get('/', c => {
  const fileData = {
    dir: {
      'inv.v': {
        source: 'module inv(input i, output o); assign o = ~i; endmodule'
      }
    }
  };
  _setFileData(fileData);
  const result = fileData.dir['inv.v'].source as unknown as string;
  return c.text(`Hello World from Hono!, result: ${result}`);
});

showRoutes(app, {
  verbose: true,
});
