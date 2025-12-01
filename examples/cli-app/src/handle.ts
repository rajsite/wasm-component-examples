export const handle = async (): Promise<void> => {
    console.log('start httpbin request');
    const request = await fetch('https://httpbin.org/json');
    console.log(request.status);
    const result = await request.text();
    console.log('finish httpbin request');
    console.log(`Hello from TypeScript!, result: ${result}`);
};
