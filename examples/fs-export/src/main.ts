import type { run as Run } from 'wasi:cli/run@0.2.3';
import { run as runIn } from 'wasi:cli/run@0.2.3';
// import { handle } from './handle';

export { preopens, types } from './fs';

export const run: {
    run: typeof Run
} = {
    run: () => {
        void (async (): Promise<void> => {
            console.log('start run outer');
            console.log('start call run inner');
            runIn();
            console.log('finish call run inner');
            // await handle();
            await Promise.resolve();
            console.log('finish run outer');
        })();
    }
};
