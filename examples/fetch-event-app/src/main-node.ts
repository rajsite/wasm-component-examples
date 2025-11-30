import { createServer } from 'http';
import { createServerAdapter } from '@whatwg-node/server';
import { handle } from './handle';

const serverAdapter = createServerAdapter(handle);
const nodeServer = createServer((req, res) => {
    void serverAdapter(req, res);
});
nodeServer.listen(8000, '127.0.0.1');
