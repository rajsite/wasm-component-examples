import type { filesystemErrorCode as FilesystemErrorCode } from 'wasi:filesystem/types@0.2.3';
// @ts-expect-error values should be exported directly
import { types as filesystemTypes } from '@bytecodealliance/preview2-shim/filesystem';
import { app } from './lib/app';
// @ts-expect-error values should be exported directly
export { preopens } from '@bytecodealliance/preview2-shim/filesystem';

const filesystemErrorCode: typeof FilesystemErrorCode = (err): never => {
  // eslint-disable-next-line @typescript-eslint/no-throw-literal
  throw err;
};
export const types = {
  // @ts-expect-error values should be exported directly
  ...filesystemTypes,
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
  filesystemErrorCode
};

// Maybe switch to https://github.com/YoWASP/runtime-js/blob/develop/lib/wasi-virt.js

app.fire();
