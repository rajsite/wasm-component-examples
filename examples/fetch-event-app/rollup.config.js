import typescript from '@rollup/plugin-typescript';
import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import dotenv from 'rollup-plugin-dotenv';

export default {
  input: 'src/main.ts',
  external: /wasi:.*/,
  output: {
    dir: 'objs/bundled',
    format: 'es',
    sourcemap: true
  },
  plugins: [dotenv(), commonjs(), resolve(), typescript({ noEmitOnError: true })]
};
