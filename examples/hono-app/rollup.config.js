import commonjs from '@rollup/plugin-commonjs';
import resolve from '@rollup/plugin-node-resolve';
import typescript from '@rollup/plugin-typescript';

export default {
    input: 'src/main.ts',
    external: /wasi:.*/,
    output: {
        dir: 'dist',
        format: 'es',
        sourcemap: true
    },
    plugins: [commonjs(), resolve(), typescript({ noEmitOnError: true })]
};
