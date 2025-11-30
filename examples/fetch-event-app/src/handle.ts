export const handle = async (_request: Request): Promise<Response> => {
    try {
        console.log('start httpbin request');
        const request = await fetch('https://httpbin.org/json');
        const result = await request.text();
        console.log('finish httpbin request');
        return new Response(`Hello from TypeScript!, result: ${result}`);
    } catch (e) {
        console.error(e);
        return new Response('whoopsies');
    }
};
