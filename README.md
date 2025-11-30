# WASM Component Examples

Various WASM component examples 🎉

## Dependencies

- Node 22 LTS+
- `wkg`available in `PATH`
  - `wkg` from [`wasm-pkg-tools`](https://github.com/bytecodealliance/wasm-pkg-tools?tab=readme-ov-file#installation)
- Wasmtime (optional, for `start-wasmtime` commands)

## Quick Start

```sh
npm install
```

```sh
npm run build
```

Run a specific example, such as `hono-app` via `wasmtime serve`:

```
npm run start-wasmtime -w examples/hono-app
```
