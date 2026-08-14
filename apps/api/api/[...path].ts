import type { IncomingMessage, ServerResponse } from 'node:http';
import handler from './index';

export default async function catchAllHandler(
  request: IncomingMessage,
  response: ServerResponse,
): Promise<void> {
  await handler(request, response);
}
