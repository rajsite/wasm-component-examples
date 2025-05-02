export * from '@bytecodealliance/preview2-shim/filesystem';

declare module '@bytecodealliance/preview2-shim/filesystem' {
  type DirectoryOrFile = Directory | File;
  interface Directory {
    dir: {
      [key: string]: DirectoryOrFile
    };
  }
  interface File {
    source: Int8Array | string;
  }
  export function _setFileData(fileData: Directory): void;
}
