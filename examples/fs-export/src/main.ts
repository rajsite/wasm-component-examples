import type { run as Run } from 'wasi:cli/run@0.2.3';
import { run as runIn } from 'wasi:cli/run@0.2.3';
import { handle } from './handle';

export { preopens, types } from './fs';

export const run: {
    run: typeof Run
} = {
    run: () => {
        void (async (): Promise<void> => {
            console.log('run parent');
            runIn();
            console.log('run self');
            await handle();
            console.log('self done');
        })();
    }
};
