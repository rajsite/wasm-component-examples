// Modified from: https://github.com/YoWASP/runtime-js/blob/01feb2d4a194fc1151c220055a49f18cc73f4d56/lib/wasi-virt.js

/* eslint-disable no-use-before-define */
/* eslint-disable no-param-reassign */
/* eslint-disable no-multi-assign */
/* eslint-disable no-restricted-syntax */
/* eslint-disable no-plusplus */
/* eslint-disable no-throw-literal */
/* eslint-disable no-bitwise */
/* eslint-disable max-classes-per-file */

export class Exit extends Error {
  constructor(code = 0) {
    super(`Exited with status ${code}`);
    this.code = code;
  }
}

function monotonicNow() {
  return BigInt(Math.floor(performance.now() * 1e6));
}

function wallClockNow() {
  const now = Date.now(); // in milliseconds
  const seconds = BigInt(Math.floor(now / 1e3));
  const nanoseconds = (now % 1e3) * 1e6;
  return { seconds, nanoseconds };
}

class Xoroshiro128StarStar {
  constructor(seed) {
    if (BigInt(seed) === 0n) {
      throw new Error('xoroshiro128** must be seeded with a non-zero state');
    }
    this.s = [BigInt(seed) & 0xffffffffffffffffn, (BigInt(seed) >> 64n) & 0xffffffffffffffffn];
  }

  next() {
    function trunc64(x) {
      return x & 0xffffffffffffffffn;
    }
    function rotl(x, k) {
      return (x << k) | (x >> (64n - k));
    }

    let [s0, s1] = this.s;
    const r = trunc64(rotl(s0 * 5n, 7n) * 9n);
    s1 ^= s0;
    s0 = trunc64(rotl(s0, 24n) ^ s1 ^ (s1 << 16n));
    s1 = trunc64(rotl(s1, 37n));
    this.s = [s0, s1];
    return r;
  }

  getBytes(length) {
    return Uint8Array.from({ length }, () => Number(BigInt.asUintN(8, this.next() >> 32n)));
  }
}

class IoError extends Error {}

class InputStream {
  read(_len) {
    throw { tag: 'closed' };
  }

  blockingRead(len) {
    return this.read(len);
  }
}

class OutputStream {
  checkWrite() {
    throw { tag: 'closed' };
  }

  write(_contents) {
    this.checkWrite();
  }

  flush() {}

  blockingFlush() {
    this.flush();
  }

  blockingWriteAndFlush(contents) {
    this.write(contents);
    this.blockingFlush();
  }
}

class CallbackInputStream extends InputStream {
  constructor(callback = null) {
    super();
    this.callback = callback;
  }

  read(len) {
    if (this.callback === null) {
      throw { tag: 'closed' };
    }
    const contents = this.callback(Number(len));
    if (contents === null) {
      throw { tag: 'closed' };
    }
    return contents;
  }
}

class CallbackOutputStream extends OutputStream {
  constructor(callback = null) {
    super();
    this.callback = callback;
  }

  checkWrite() {
    return 4096;
  }

  write(contents) {
    if (this.callback !== null) {
      this.callback(contents);
    }
  }

  flush() {
    if (this.callback !== null) {
      this.callback(null);
    }
  }
}

class TerminalInput {}
class TerminalOutput {}

// Only used for `metadataHash` and `metadataHashAt`.
// See https://github.com/bytecodealliance/wasmtime/issues/8956.
const nextFilesystemId = (() => {
  let id = 0;
  return () => id++;
})();

class File {
  constructor(data = '') {
    this.id = nextFilesystemId();
    if (data instanceof Uint8Array) {
      this.data = data;
    } else if (typeof data === 'string') {
      this.data = new TextEncoder().encode(data);
    } else {
      throw new Error(`Cannot construct a file from ${typeof data}`);
    }
  }

  get size() {
    return this.data.length;
  }
}

class Directory {
  constructor(files = {}) {
    this.id = nextFilesystemId();
    this.files = files;
  }

  get size() {
    return Object.keys(this.files).length;
  }

  traverse(path, { create = null, remove = false } = {}) {
    let entry = this;
    let separatorAt = -1;
    do {
      if (entry instanceof File) {
        throw 'not-directory';
      }
      const files = entry.files;
      separatorAt = path.indexOf('/');
      const segment = separatorAt === -1 ? path : path.substring(0, separatorAt);
      if (separatorAt === -1 && remove) {
        delete files[segment];
      } else if (segment === '' || segment === '.') {
        /* disregard */
      } else if (segment === '..') {
        /* hack to make scandir() work */
      } else if (Object.hasOwn(files, segment)) {
        entry = files[segment];
      } else if (create === 'directory' || (create !== null && separatorAt !== -1)) {
        entry = files[segment] = new Directory({});
      } else if (create === 'file') {
        entry = files[segment] = new File(new Uint8Array());
      } else if (create instanceof File || create instanceof Directory) {
        entry = files[segment] = create;
      } else {
        throw 'no-entry';
      }
      path = path.substring(separatorAt + 1);
    } while (separatorAt !== -1);
    return entry;
  }
}

class ReadStream extends InputStream {
  constructor(file, offset) {
    super();
    this.file = file;
    this.offset = offset;
  }

  read(len) {
    const data = this.file.data.subarray(Number(this.offset), Number(this.offset + len));
    this.offset += len;
    return data;
  }
}

class WriteStream extends OutputStream {
  constructor(file, offset) {
    super();
    this.file = file;
    this.offset = offset;
  }

  write(contents) {
    const offset = Number(this.offset);
    const newData = new Uint8Array(Math.max(this.file.data.length, offset + contents.length));
    newData.set(this.file.data);
    newData.subarray(offset).set(contents);
    this.file.data = newData;
    this.offset += BigInt(contents.length);
  }
}

class Descriptor {
  constructor(entry) {
    this.entry = entry;
  }

  getType() {
    if (this.entry instanceof Directory) {
      return 'directory';
    }
    if (this.entry instanceof File) {
      return 'regular-file';
    }
    throw new Error('Unexpected filesystem entry type');
  }

  getFlags() {
    return {};
  }

  metadataHash() {
    // See https://github.com/bytecodealliance/wasmtime/issues/8956.
    return { upper: 0, lower: this.entry.id };
  }

  metadataHashAt(_pathFlags, path) {
    if (!(this.entry instanceof Directory)) {
      throw 'invalid';
    }
    const pathEntry = this.entry.traverse(path);
    return new Descriptor(pathEntry).metadataHash();
  }

  stat() {
    let type;
    if (this.entry instanceof Directory) {
      type = 'directory';
    }
    if (this.entry instanceof File) {
      type = 'regular-file';
    }
    return {
      type,
      linkCount: 1,
      size: this.entry.size,
      dataAccessTimestamp: null,
      dataModificationTimestamp: null,
      statusChangeTimestamp: null
    };
  }

  statAt(_pathFlags, path) {
    if (!(this.entry instanceof Directory)) {
      throw 'invalid';
    }
    const pathEntry = this.entry.traverse(path);
    return new Descriptor(pathEntry).stat();
  }

  openAt(_pathFlags, path, openFlags, _descriptorFlags) {
    if (!(this.entry instanceof Directory)) {
      throw 'invalid';
    }
    const openEntry = this.entry.traverse(path, openFlags.create ? { create: 'file' } : {});
    if (openFlags.directory) {
      if (!(openEntry instanceof Directory)) {
        throw 'not-directory';
      }
    } else {
      if (openEntry instanceof Directory) {
        throw 'is-directory';
      }
      if (openFlags.truncate) {
        openEntry.data = new Uint8Array();
      }
    }
    return new Descriptor(openEntry);
  }

  read(length, offset) {
    if (this.entry instanceof Directory) {
      throw 'is-directory';
    }
    [length, offset] = [Number(length), Number(offset)];
    return [this.entry.data.subarray(offset, offset + length), offset + length >= this.entry.data.byteLength];
  }

  readViaStream(offset) {
    return new ReadStream(this.entry, offset);
  }

  write(_buffer, _offset) {
    if (this.entry instanceof Directory) {
      throw 'is-directory';
    }
    console.error('Descriptor.write not implemented');
    throw 'unsupported';
  }

  writeViaStream(offset) {
    return new WriteStream(this.entry, offset);
  }

  setSize(size) {
    if (this.entry instanceof Directory) {
      throw 'is-directory';
    }
    size = Number(size);
    if (size > this.entry.data.length) {
      const newData = new Uint8Array(size);
      newData.set(this.entry.data);
      this.entry.data = newData;
    } else if (size < this.entry.data.length) {
      this.entry.data = this.entry.data.subarray(0, size);
    }
  }

  readDirectory() {
    return new DirectoryEntryStream(this.entry);
  }

  createDirectoryAt(path) {
    this.entry.traverse(path, { create: 'directory' });
  }

  unlinkFileAt(path) {
    const pathEntry = this.entry.traverse(path);
    if (pathEntry instanceof Directory) {
      throw 'is-directory';
    }
    this.entry.traverse(path, { remove: true });
  }

  removeDirectoryAt(path) {
    const pathEntry = this.entry.traverse(path);
    if (!(pathEntry instanceof Directory)) {
      throw 'not-directory';
    }
    this.entry.traverse(path, { remove: true });
  }

  readlinkAt(path) {
    // eslint-disable-next-line no-unused-vars
    const _pathEntry = this.entry.traverse(path);
    throw 'invalid';
  }

  renameAt(oldPath, newDescriptor, newPath) {
    if (!(this.entry instanceof Directory)) {
      throw 'not-directory';
    }
    if (!(newDescriptor.entry instanceof Directory)) {
      throw 'not-directory';
    }
    const oldEntry = this.entry.traverse(oldPath);
    this.entry.traverse(newPath, { create: oldEntry });
    this.entry.traverse(oldPath, { remove: true });
  }
}

class DirectoryEntryStream {
  constructor(directory) {
    this.entries = Object.entries(directory.files);
    this.index = 0;
  }

  readDirectoryEntry() {
    if (this.index === this.entries.length) {
      return null;
    }
    const [name, entry] = this.entries[this.index++];
    let type;
    if (entry instanceof Directory) {
      type = 'directory';
    }
    if (entry instanceof File) {
      type = 'regular-file';
    }
    return { name, type };
  }
}

export function directoryFromTree(tree) {
  const files = {};
  for (const [filename, data] of Object.entries(tree)) {
    if (typeof data === 'string' || data instanceof Uint8Array) {
      files[filename] = new File(tree[filename]);
    } else {
      files[filename] = directoryFromTree(tree[filename]);
    }
  }
  return new Directory(files);
}

export function directoryIntoTree(directory, { decodeASCII = true } = {}) {
  function isASCII(buffer) {
    for (const byte of buffer) {
      if ((byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) || byte >= 0x7f) {
        return false;
      }
    }
    return true;
  }

  const tree = {};
  for (const [filename, entry] of Object.entries(directory.files)) {
    if (entry instanceof File) {
      tree[filename] = (decodeASCII && isASCII(entry.data)) ? new TextDecoder().decode(entry.data) : entry.data;
    }
    if (entry instanceof Directory) {
      tree[filename] = directoryIntoTree(entry, { decodeASCII });
    }
  }
  return tree;
}

export class Environment {
  vars = {};
  args = [];
  root = new Directory({});

  constructor() {
    this.prng = new Xoroshiro128StarStar(1n);

    this.standardInputStream = new CallbackInputStream();
    this.standardOutputStream = new CallbackOutputStream();
    this.standardErrorStream = new CallbackOutputStream();

    this.terminalInput = new TerminalInput();
    this.terminalOutput = new TerminalOutput();

    const $this = this;
    this.exports = {
      monotonicClock: {
        now: monotonicNow
      },
      wallClock: {
        now: wallClockNow
      },
      random: {
        getRandomBytes(length) {
          return $this.prng.getBytes(Number(length));
        }
      },
      io: {
        Error: IoError,
        InputStream,
        OutputStream,
      },
      cli: {
        exit(status) {
          throw new Exit(status.tag === 'ok' ? 0 : 1);
        },
        getEnvironment() {
          return $this.vars;
        },
        getArguments() {
          return $this.args;
        },
        getStdin() {
          return $this.standardInputStream;
        },
        getStdout() {
          return $this.standardOutputStream;
        },
        getStderr() {
          return $this.standardErrorStream;
        },
        getTerminalStdin() {
          return $this.terminalInput;
        },
        getTerminalStdout() {
          return $this.terminalOutput;
        },
        getTerminalStderr() {
          return $this.terminalOutput;
        },
        TerminalInput,
        TerminalOutput,
      },
      fs: {
        Descriptor,
        DirectoryEntryStream,
        filesystemErrorCode() {},
        getDirectories() {
          if ($this.root === null) {
            return [];
          }
          return [[new Descriptor($this.root), '/']];
        },
      }
    };
  }

  get stdin() {
    return this.standardInputStream.callback;
  }

  set stdin(callback) {
    this.standardInputStream.callback = callback;
  }

  get stdout() {
    return this.standardOutputStream.callback;
  }

  set stdout(callback) {
    this.standardOutputStream.callback = callback;
  }

  get stderr() {
    return this.standardErrorStream.callback;
  }

  set stderr(callback) {
    this.standardErrorStream.callback = callback;
  }
}
