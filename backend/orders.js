import { createHash } from 'node:crypto';
import { HttpError } from './errors.js';
import { normalizeOrder, normalizeCartOrder, cartFingerprint } from './order-validation.js';
import { usesSupabase, supabaseRequest } from './supabase.js';

export async function createOrder(input, key) {
  if (input && Object.hasOwn(input, 'items')) return createCartOrder(input, key);
  if (!usesSupabase()) {
    const local = await import('./sqlite-orders.js');
    return local.createOrder(input, key);
  }

  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
    throw new HttpError(400, 'معرّف محاولة الطلب غير صحيح.');
  }

  const order = normalizeOrder(input);
  const hash = createHash('sha256').update(JSON.stringify(order)).digest('hex');
  let expectedPrice = null;
  if (input.expectedUnitPrice !== undefined) {
    expectedPrice = Math.round(input.expectedUnitPrice * 100);
    if (typeof input.expectedUnitPrice !== 'number' || !Number.isSafeInteger(expectedPrice) || expectedPrice < 0) {
      throw new HttpError(400, 'السعر المتوقع غير صحيح.');
    }
  }

  const result = await supabaseRequest('rpc/create_scene_order', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      p_key: key,
      p_hash: hash,
      p_order: order,
      p_expected_price_cents: expectedPrice,
    }),
  });

  if (result.error) throw new HttpError(result.status, result.error);
  return result;
}

async function createCartOrder(input, key) {
  if (!usesSupabase()) {
    const local = await import('./sqlite-orders.js');
    return local.createCartOrder(input, key);
  }
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new HttpError(400, 'معرّف محاولة الطلب غير صحيح.');
  const order = normalizeCartOrder(input);
  const hash = createHash('sha256').update(cartFingerprint(order)).digest('hex');
  const result = await supabaseRequest('rpc/create_scene_cart_order', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_hash: hash, p_order: order }),
  });
  if (result.error) throw new HttpError(result.status, result.error);
  return result;
}
