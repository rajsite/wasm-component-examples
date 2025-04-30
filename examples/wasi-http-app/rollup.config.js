import typescript from '@rollup/plugin-typescript';
import resolve from '@rollup/plugin-node-resolve';

export default {
  input: 'src/main.ts',
  external: /wasi:.*/,
  output: {
    dir: 'objs/bundled',
    format: 'es',
    sourcemap: true
  },
  plugins: [resolve(), typescript()]
};
