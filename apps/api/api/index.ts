import type { IncomingMessage, ServerResponse } from 'node:http';
import { createApplication } from '../src/application';

type HttpHandler = (
  request: IncomingMessage,
  response: ServerResponse,
) => void;

let handlerPromise: Promise<HttpHandler> | undefined;

function restoreNestedApiPath(request: IncomingMessage) {
  const requestUrl = new URL(request.url ?? '/api', 'http://localhost');
  const path = requestUrl.searchParams.get('__eventdev_path');

  if (!path) {
    return;
  }

  requestUrl.searchParams.delete('__eventdev_path');
  const query = requestUrl.searchParams.toString();
  request.url = `/api/${path}${query ? `?${query}` : ''}`;
}

async function createHandler(): Promise<HttpHandler> {
  const app = await createApplication();
  await app.init();

  return app.getHttpAdapter().getInstance() as HttpHandler;
}

export default async function handler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  restoreNestedApiPath(request);

  handlerPromise ??= createHandler();
  const httpHandler = await handlerPromise;

  httpHandler(request, response);
}
