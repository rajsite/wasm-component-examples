import type { run as Run } from 'wasi:cli/run@0.2.3';
import { handle } from './handle';

export const run: {
    run: typeof Run
} = {
    run: () => {
        void (async (): Promise<void> => {
            await handle();
        })();
    }
};
