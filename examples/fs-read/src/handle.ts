import { getDirectories } from 'wasi:filesystem/preopens@0.2.3';

export const handle = async (): Promise<void> => {
    console.log('start read dir');
    const entries = getDirectories();
    console.log(`count: ${entries.length}`);
    for (const entry of entries) {
        using descriptor = entry[0];
        const path = entry[1];

        console.log('path', path);
        console.log('type', descriptor.getType());
        using dirStream = descriptor.readDirectory();
        for (;;) {
            const dirEntry = dirStream.readDirectoryEntry();
            if (!dirEntry) {
                break;
            }
            console.log('descriptor', dirEntry.name);
        }
    }
    await Promise.resolve();
    console.log('finish read dir');
};
