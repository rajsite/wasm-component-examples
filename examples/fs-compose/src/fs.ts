// Modified from: https://github.com/YoWASP/runtime-js/blob/develop/lib/wasi-virt.js
/* eslint-disable */

import type {
    DirectoryEntry as WasiDirectoryEntry,
    Descriptor as WasiDescriptor,
    DescriptorType as WasiDescriptorType,
    DirectoryEntryStream as WasiDirectoryEntryStream,
    DescriptorStat as WasiDescriptorStat,
    MetadataHashValue as WasiMetadataHashValue,
    DescriptorFlags as WasiDescriptorFlags,
    OpenFlags as WasiOpenFlags,
    InputStream as WasiInputStream,
    OutputStream as WasiOutputStream,
    PathFlags as WasiPathFlags,
    Advice as WasiAdvice,
    Filesize as WasiFilesize,
    NewTimestamp as WasiNewTimestamp,
} from 'wasi:filesystem/types@0.2.3';
import type { Pollable as WasiPollable } from 'wasi:io/streams@0.2.3';
import type * as WasiFilesystemTypes from 'wasi:filesystem/types@0.2.3';
import type * as WasiFilesystemPreopens from 'wasi:filesystem/preopens@0.2.3';


export class Exit extends Error {
    constructor(public code: number = 0) {
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
    s: [bigint, bigint];
    constructor(seed: bigint) {
        if (BigInt(seed) === 0n) {
            throw new Error('xoroshiro128** must be seeded with a non-zero state');
        }
        this.s = [BigInt(seed) & 0xffffffffffffffffn, (BigInt(seed) >> 64n) & 0xffffffffffffffffn];
    }

    next(): bigint {
        function trunc64(x: bigint): bigint {
            return x & 0xffffffffffffffffn;
        }
        function rotl(x: bigint, k: bigint): bigint {
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

    getBytes(length: number): Uint8Array {
        return Uint8Array.from({ length }, () => Number(BigInt.asUintN(8, this.next() >> 32n)));
    }
}

class IoError extends Error { }

class InputStream implements WasiInputStream {
    skip(len: bigint): bigint {
        throw new Error('Method not implemented.');
    }
    blockingSkip(len: bigint): bigint {
        throw new Error('Method not implemented.');
    }
    subscribe(): WasiPollable {
        throw new Error('Method not implemented.');
    }
    [Symbol.dispose](): void {
        // throw new Error('Method not implemented.');
    }
    read(_len: bigint): Uint8Array {
        throw { tag: 'closed' };
    }

    blockingRead(len: bigint): Uint8Array {
        return this.read(len);
    }
}

class OutputStream implements WasiOutputStream {
    subscribe(): WasiPollable {
        throw new Error('Method not implemented.');
    }
    writeZeroes(len: bigint): void {
        throw new Error('Method not implemented.');
    }
    blockingWriteZeroesAndFlush(len: bigint): void {
        throw new Error('Method not implemented.');
    }
    splice(src: WasiInputStream, len: bigint): bigint {
        throw new Error('Method not implemented.');
    }
    blockingSplice(src: WasiInputStream, len: bigint): bigint {
        throw new Error('Method not implemented.');
    }
    [Symbol.dispose](): void {
        // throw new Error('Method not implemented.');
    }
    checkWrite(): bigint {
        throw { tag: 'closed' };
    }

    write(_contents: Uint8Array): void {
        this.checkWrite();
    }

    flush(): void { }

    blockingFlush(): void {
        this.flush();
    }

    blockingWriteAndFlush(contents: Uint8Array): void {
        this.write(contents);
        this.blockingFlush();
    }
}

class CallbackInputStream extends InputStream {
    constructor(public callback: ((len: number) => Uint8Array | null) | null = null) {
        super();
        this.callback = callback;
    }

    read(len: bigint): Uint8Array {
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
    constructor(public callback: ((contents: Uint8Array | null) => void) | null = null) {
        super();
        this.callback = callback;
    }

    checkWrite(): bigint {
        return 4096n;
    }

    write(contents: Uint8Array): void {
        if (this.callback !== null) {
            this.callback(contents);
        }
    }

    flush(): void {
        if (this.callback !== null) {
            this.callback(null);
        }
    }
}

class TerminalInput { }
class TerminalOutput { }

// Only used for `metadataHash` and `metadataHashAt`.
// See https://github.com/bytecodealliance/wasmtime/issues/8956.
const nextFilesystemId = (function () {
    let id = 0n;
    return () => id++;
}());

class File {
    id: bigint;
    data: Uint8Array;
    constructor(data: string | Uint8Array = '') {
        this.id = nextFilesystemId();
        if (data instanceof Uint8Array) {
            this.data = data;
        } else if (typeof data === 'string') {
            this.data = new TextEncoder().encode(data);
        } else {
            throw new Error(`Cannot construct a file from ${typeof data}`);
        }
    }

    get size(): number {
        return this.data.length;
    }
}

interface TraverseOptions {
    create?: 'directory' | 'file' | File | Directory | null;
    remove?: boolean;
}

class Directory {
    id: bigint;
    constructor(public files: Record<string, File | Directory> = {}) {
        this.id = nextFilesystemId();
        this.files = files;
    }

    get size(): number {
        return Object.keys(this.files).length;
    }

    traverse(path: string, { create = null, remove = false }: TraverseOptions = {}): File | Directory {
        let entry: File | Directory = this;
        let separatorAt = -1;
        do {
            if (entry instanceof File) {
                throw 'not-directory';
            }
            const files: Record<string, File | Directory> = entry.files;
            separatorAt = path.indexOf('/');
            const segment = separatorAt === -1 ? path : path.substring(0, separatorAt);
            if (separatorAt === -1 && remove) {
                delete files[segment];
            } else if (segment === '' || segment === '.')
            /* disregard */{} else if (segment === '..')
            /* hack to make scandir() work */{} else if (Object.hasOwn(files, segment)) {
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

class ReadInputStream extends InputStream {
    constructor(public file: File, public offset: bigint) {
        super();
        this.file = file;
        this.offset = offset;
    }

    override read(len: bigint): Uint8Array {
        const data = this.file.data.subarray(Number(this.offset), Number(this.offset + len));
        this.offset += len;
        return data;
    }
}

class WriteOutputStream extends OutputStream {
    constructor(public file: File, public offset: bigint) {
        super();
        this.file = file;
        this.offset = offset;
    }

    override write(contents: Uint8Array): void {
        const offset = Number(this.offset);
        const newData = new Uint8Array(Math.max(this.file.data.length, offset + contents.length));
        newData.set(this.file.data);
        newData.subarray(offset).set(contents);
        this.file.data = newData;
        this.offset += BigInt(contents.length);
    }
}

class Descriptor implements WasiDescriptor {
    // TODO created default value to satisfy type but should be unused
    constructor(public entry: Directory | File = new Directory()) {
        this.entry = entry;
    }
    appendViaStream(): WasiOutputStream {
        throw new Error('Method not implemented.');
    }
    advise(offset: WasiFilesize, length: WasiFilesize, advice: WasiAdvice): void {
        throw new Error('Method not implemented.');
    }
    syncData(): void {
        throw new Error('Method not implemented.');
    }
    setTimes(dataAccessTimestamp: WasiNewTimestamp, dataModificationTimestamp: WasiNewTimestamp): void {
        throw new Error('Method not implemented.');
    }
    sync(): void {
        throw new Error('Method not implemented.');
    }
    setTimesAt(pathFlags: WasiPathFlags, path: string, dataAccessTimestamp: WasiNewTimestamp, dataModificationTimestamp: WasiNewTimestamp): void {
        throw new Error('Method not implemented.');
    }
    linkAt(oldPathFlags: WasiPathFlags, oldPath: string, newDescriptor: WasiDescriptor, newPath: string): void {
        throw new Error('Method not implemented.');
    }
    symlinkAt(oldPath: string, newPath: string): void {
        throw new Error('Method not implemented.');
    }
    isSameObject(other: WasiDescriptor): boolean {
        throw new Error('Method not implemented.');
    }

    getType(): WasiDescriptorType {
        if (this.entry instanceof Directory) {
            return 'directory';
        }
        if (this.entry instanceof File) {
            return 'regular-file';
        }
        throw new Error('unknown type, expected directory or file');
    }

    getFlags(): WasiDescriptorFlags {
        return {};
    }

    metadataHash(): WasiMetadataHashValue {
        // See https://github.com/bytecodealliance/wasmtime/issues/8956.
        return { upper: 0n, lower: this.entry.id };
    }

    metadataHashAt(_pathFlags: WasiPathFlags, path: string): { upper: bigint; lower: bigint } {
        if (!(this.entry instanceof Directory)) {
            throw 'invalid';
        }
        const pathEntry = this.entry.traverse(path);
        return new Descriptor(pathEntry).metadataHash();
    }

    stat(): WasiDescriptorStat {
        let type: WasiDescriptorType;
        if (this.entry instanceof Directory) {
            type = 'directory';
        } else if (this.entry instanceof File) {
            type = 'regular-file';
        } else {
            throw new Error('unknown type, expected directory or file');
        }
        return {
            type,
            linkCount: 1n,
            size: BigInt(this.entry.size),
            dataAccessTimestamp: undefined,
            dataModificationTimestamp: undefined,
            statusChangeTimestamp: undefined
        };
    }

    statAt(_pathFlags: WasiPathFlags, path: string): WasiDescriptorStat {
        if (!(this.entry instanceof Directory)) {
            throw 'invalid';
        }
        const pathEntry = this.entry.traverse(path);
        return new Descriptor(pathEntry).stat();
    }

    openAt(_pathFlags: WasiPathFlags, path: string, openFlags: WasiOpenFlags, _descriptorFlags: WasiDescriptorFlags): Descriptor {
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

    read(len: bigint, off: bigint): [Uint8Array, boolean] {
        if (this.entry instanceof Directory) {
            throw 'is-directory';
        }
        const [length, offset] = [Number(len), Number(off)];
        return [this.entry.data.subarray(offset, offset + length), offset + length >= this.entry.data.byteLength];
    }

    readViaStream(offset: bigint): ReadInputStream {
        if (this.entry instanceof Directory) {
            throw 'is-directory';
        }
        return new ReadInputStream(this.entry, offset);
    }

    write(_buffer: Uint8Array, _offset: bigint): bigint {
        if (this.entry instanceof Directory) {
            throw 'is-directory';
        }
        console.error('Descriptor.write not implemented');
        throw 'unsupported';
    }

    writeViaStream(offset: bigint): WriteOutputStream {
        if (this.entry instanceof Directory) {
            throw 'is-directory';
        }
        return new WriteOutputStream(this.entry, offset);
    }

    setSize(s: bigint): void {
        if (this.entry instanceof Directory) {
            throw 'is-directory';
        }
        const size = Number(s);
        if (size > this.entry.data.length) {
            const newData = new Uint8Array(size);
            newData.set(this.entry.data);
            this.entry.data = newData;
        } else if (size < this.entry.data.length) {
            this.entry.data = this.entry.data.subarray(0, size);
        }
    }

    readDirectory(): DirectoryEntryStream {
        if (!(this.entry instanceof Directory)) {
            throw 'not-directory';
        }
        return new DirectoryEntryStream(this.entry);
    }

    createDirectoryAt(path: string): void {
        if (!(this.entry instanceof Directory)) {
            throw 'not-directory';
        }
        this.entry.traverse(path, { create: 'directory' });
    }

    unlinkFileAt(path: string): void {
        if (!(this.entry instanceof Directory)) {
            throw 'not-directory';
        }
        const pathEntry = this.entry.traverse(path);
        if (pathEntry instanceof Directory) {
            throw 'is-directory';
        }
        this.entry.traverse(path, { remove: true });
    }

    removeDirectoryAt(path: string): void {
        if (!(this.entry instanceof Directory)) {
            throw 'not-directory';
        }
        const pathEntry = this.entry.traverse(path);
        if (!(pathEntry instanceof Directory)) {
            throw 'not-directory';
        }
        this.entry.traverse(path, { remove: true });
    }

    readlinkAt(path: string): string {
        if (!(this.entry instanceof Directory)) {
            throw 'not-directory';
        }
        const _pathEntry = this.entry.traverse(path);
        throw 'invalid';
    }

    renameAt(oldPath: string, newDescriptor: Descriptor, newPath: string): void {
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

class DirectoryEntryStream implements WasiDirectoryEntryStream {
    entries: [string, File | Directory][];
    index: number;
    // TODO created default value to satisfy type but should be unused
    constructor(directory: Directory = new Directory()) {
        this.entries = Object.entries(directory.files);
        this.index = 0;
    }

    readDirectoryEntry(): WasiDirectoryEntry | undefined {
        if (this.index === this.entries.length) {
            return undefined;
        }
        const [name, entry] = this.entries[this.index++];
        let type: WasiDescriptorType;
        if (entry instanceof Directory) {
            type = 'directory';
        } if (entry instanceof File) {
            type = 'regular-file';
        } else {
            throw new Error('Expected File or Directory');
        }
        return {name, type};
    }
}

type FileTree = { [key: string]: string | Uint8Array | FileTree };

export function directoryFromTree(tree: FileTree): Directory {
    const files: Record<string, File | Directory> = {};
    for (const [filename, data] of Object.entries(tree)) {
        if (typeof data === 'string' || data instanceof Uint8Array) {
            files[filename] = new File(data);
        } else {
            files[filename] = directoryFromTree(data);
        }
    }
    return new Directory(files);
}

export function directoryIntoTree(directory: Directory, { decodeASCII = true }: { decodeASCII?: boolean } = {}): FileTree {
    function isASCII(buffer: Uint8Array): boolean {
        for (const byte of buffer) {
            if ((byte < 0x20 && byte !== 0x09 && byte !== 0x0a && byte !== 0x0d) || byte >= 0x7f) {
                return false;
            }
        }
        return true;
    }

    const tree: FileTree = {};
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

interface ExitStatus {
    tag: 'ok' | 'err';
}

export class Environment {
    vars: Record<string, string> = {};
    args: string[] = [];
    root: Directory = new Directory({});
    prng: Xoroshiro128StarStar;
    standardInputStream: CallbackInputStream;
    standardOutputStream: CallbackOutputStream;
    standardErrorStream: CallbackOutputStream;
    terminalInput: TerminalInput;
    terminalOutput: TerminalOutput;
    exports: Record<string, unknown>;

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
                getRandomBytes(length: bigint): Uint8Array {
                    return $this.prng.getBytes(Number(length));
                }
            },
            io: {
                Error: IoError,
                InputStream,
                OutputStream,
            },
            cli: {
                exit(status: ExitStatus): never {
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
                filesystemErrorCode() { },
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

const root: Directory = new Directory({});

export const preopens = {
    getDirectories: () => {
        return [[new Descriptor(root), '/']];
    }
} satisfies typeof WasiFilesystemPreopens;

export const types = {
    filesystemErrorCode: () => undefined,
    Descriptor,
    DirectoryEntryStream,
} satisfies typeof WasiFilesystemTypes;
