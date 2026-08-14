import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApplication } from '../src/application';

type HttpHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void;

let handlerPromise: Promise<HttpHandler> | undefined;

async function createHandler(): Promise<HttpHandler> {
  const app = await createApplication();
  await app.init();

  return app.getHttpAdapter().getInstance() as HttpHandler;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  handlerPromise ??= createHandler();
  const httpHandler = await handlerPromise;

  httpHandler(request, response);
}
