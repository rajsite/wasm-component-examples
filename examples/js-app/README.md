# JS App

Minimal example of the JCO toolchain to create issue reproductions.

## Required setup

The example does not ship with `wit/deps`. Those will need to be populated to build.

### Populate WIT dependencies

- Install `wash` cli, see [wasmcloud quickstart](https://wasmcloud.com/docs/tour/hello-world/).
- Update `wit/main.wit` with needed WASI imports
- Run `npm run build:wit`
- Since `wit/deps` is in `.gitignore` make sure `wit/deps` is included in issue reproduction examples

## Dependencies

- Node.js LTS

## Usage

Build:

- `npm install`
- `npm run build`

Run:

- `npm run start-jco`
- `npm run start-wasmtime` (requires `wasmtime` to be installed)
