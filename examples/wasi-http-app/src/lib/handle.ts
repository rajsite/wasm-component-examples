import {
  ResponseOutparam,
  OutgoingBody,
  OutgoingResponse,
  Fields,
  type IncomingRequest,
} from 'wasi:http/types@0.2.3';

export const handle = (_request: IncomingRequest, responseOut: ResponseOutparam): void => {
  const fields = new Fields();
  const outgoingResponse = new OutgoingResponse(fields);

  const outgoingBody = outgoingResponse.body();
  {
    const outputStream = outgoingBody.write();
    outputStream.blockingWriteAndFlush(
      new Uint8Array(new TextEncoder().encode('Hello from Bundled TypeScript!\n'))
    );
    /* eslint-disable */
    // @ts-expect-error: This is required in order to dispose the stream before we return
    outputStream[Symbol.dispose]();
    /* eslint enable */
  }

  outgoingResponse.setStatusCode(200);
  OutgoingBody.finish(outgoingBody, undefined);
  ResponseOutparam.set(responseOut, { tag: 'ok', val: outgoingResponse });
};
