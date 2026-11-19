import { readProducts } from './catalog.js';
import { createOrder } from './orders.js';
import { HttpError } from './errors.js';
import { notifyNewOrder } from './notifications.js';
import { checkAdminOrigin, requireAdmin, loginAdmin, logoutAdmin, listAdminOrders, updateAdminStatus } from './admin.js';

const bodyLimit = 16 * 1024;

function readJson(request) {
  if ('body' in request) {
    try {
      const parsed = request.body;
      const serialized = JSON.stringify(parsed);
      if (serialized === undefined) throw new Error('Missing JSON');
      if (Buffer.byteLength(serialized) > bodyLimit) {
        return Promise.reject(new HttpError(413, 'بيانات الطلب أكبر من المسموح.'));
      }
      return Promise.resolve(parsed);
    } catch {
      return Promise.reject(new HttpError(400, 'بيانات الطلب غير صحيحة.'));
    }
  }
  return new Promise((resolve, reject) => {
    let size = 0;
    let chunks = [];

    request.on('data', (chunk) => {
      size += chunk.length;
      if (size <= bodyLimit) chunks.push(chunk);
      else chunks = [];
    });
    request.on('end', () => {
      if (size > bodyLimit) {
        reject(new HttpError(413, 'بيانات الطلب أكبر من المسموح.'));
        return;
      }
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(new HttpError(400, 'بيانات الطلب غير صحيحة.'));
      }
    });
    request.on('error', reject);
    request.on('aborted', () => reject(new HttpError(400, 'الطلب اتقطع. حاول تاني.')));
  });
}

function send(response, status, body, headers = {}) {
  if (response.destroyed) return;
  response.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  response.end(JSON.stringify(body));
}

export async function handleRequest(request, response) {
  const path = request.url.split('?')[0];

  try {
    if (path === '/api/admin') {
      response.setHeader('Cache-Control', 'no-store, private');
      response.setHeader('X-Content-Type-Options', 'nosniff');
      const params = new URL(request.url, 'http://localhost').searchParams;
      const action = params.get('action') || 'session';
      if (!['GET', 'POST'].includes(request.method)) {
        send(response, 405, { error: 'Method not allowed' }, { Allow: 'GET, POST' });
        return;
      }
      if (request.method === 'POST') {
        checkAdminOrigin(request);
        if (action === 'logout') {
          send(response, 200, { ok: true }, { 'Set-Cookie': await logoutAdmin(request) });
          return;
        }
        if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
          throw new HttpError(415, 'نوع بيانات الطلب غير صحيح.');
        }
        if (action === 'login') {
          const result = await loginAdmin(await readJson(request));
          send(response, 200, { user: result.user }, { 'Set-Cookie': result.cookie });
          return;
        }
        await requireAdmin(request);
        if (action === 'status') {
          send(response, 200, await updateAdminStatus(await readJson(request)));
          return;
        }
      } else {
        const user = await requireAdmin(request);
        if (action === 'session') { send(response, 200, { user }); return; }
        if (action === 'orders') { send(response, 200, await listAdminOrders(params)); return; }
      }
      send(response, 404, { error: 'Not found' });
      return;
    }
    if (path === '/api/products') {
      if (request.method !== 'GET') {
        send(response, 405, { error: 'Method not allowed' }, { Allow: 'GET' });
        return;
      }
      send(response, 200, await readProducts());
      return;
    }

    if (path === '/api/orders') {
      if (request.method !== 'POST') {
        send(response, 405, { error: 'Method not allowed' }, { Allow: 'POST' });
        return;
      }
      if (request.headers['content-type']?.split(';')[0].trim().toLowerCase() !== 'application/json') {
        request.resume();
        throw new HttpError(415, 'نوع بيانات الطلب غير صحيح.');
      }
      const body = await readJson(request);
      const result = await createOrder(body, request.headers['idempotency-key']);
      await notifyNewOrder(result);
      send(response, result.replayed ? 200 : 201, result.order);
      return;
    }

    send(response, 404, { error: 'Not found' });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 500;
    send(response, status, {
      error: status === 500 ? 'حصلت مشكلة في حفظ البيانات. حاول تاني.' : error.message,
    });
  }
}


