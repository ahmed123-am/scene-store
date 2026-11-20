import { Readable } from 'node:stream';
import { handleRequest } from '../../backend/routes.js';

// Keep the existing API, validation, sessions, and order logic on both hosts.
export default async function api(request, context) {
  const url = new URL(request.url);
  const incoming = request.body ? Readable.fromWeb(request.body) : Readable.from([]);
  incoming.url = url.pathname + url.search;
  incoming.method = request.method;
  incoming.headers = Object.fromEntries(request.headers);
  incoming.headers.host = url.host;
  // context.ip is supplied by Netlify; do not trust client forwarded-IP headers.
  incoming.socket = { remoteAddress: context.ip || 'unknown' };
  const headers = new Headers();
  let status = 200, body = '';
  const response = {
    destroyed: false,
    setHeader(name, value) { headers.set(name, value); },
    writeHead(code, values) {
      status = code;
      for (const [name, value] of Object.entries(values)) headers.set(name, value);
    },
    end(value) { body = value ?? ''; },
  };
  await handleRequest(incoming, response);
  return new Response(body, { status, headers });
}

export const config = {
  path: ['/api/products', '/api/orders', '/api/custom-orders', '/api/admin'],
};
