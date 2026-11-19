import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash, randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';
import { readProducts } from './catalog.js';
import { normalizeOrder } from './order-validation.js';

const databasePath = process.env.SCENE_ORDER_DB
  ?? fileURLToPath(new URL('./data/orders.sqlite', import.meta.url));

mkdirSync(dirname(databasePath), { recursive: true });
const database = new DatabaseSync(databasePath);

database.exec(
  'PRAGMA journal_mode=WAL;' +
  'PRAGMA busy_timeout=5000;' +
  'CREATE TABLE IF NOT EXISTS orders (' +
  'id TEXT PRIMARY KEY, idempotency_key TEXT NOT NULL UNIQUE,' +
  'request_hash TEXT NOT NULL, created_at TEXT NOT NULL,' +
  'product_id TEXT NOT NULL, product_name TEXT NOT NULL,' +
  'quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 50),' +
  'unit_price_cents INTEGER NOT NULL, subtotal_cents INTEGER NOT NULL,' +
  'customer_name TEXT NOT NULL, phone TEXT NOT NULL,' +
  'address TEXT NOT NULL, notes TEXT NOT NULL, status TEXT NOT NULL' +
  ')',
);

const findOrder = database.prepare('SELECT * FROM orders WHERE idempotency_key = ?');
const insertOrder = database.prepare(
  'INSERT INTO orders VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)' +
  ' ON CONFLICT(idempotency_key) DO NOTHING',
);

function receipt(order) {
  return {
    id: order.id,
    createdAt: order.created_at,
    status: order.status,
    productName: order.product_name,
    quantity: order.quantity,
    unitPrice: order.unit_price_cents / 100,
    subtotal: order.subtotal_cents / 100,
    currency: 'EGP',
  };
}

function checkRetry(order, hash) {
  if (order.request_hash !== hash) {
    throw new HttpError(409, 'بيانات المحاولة اتغيّرت. افتح الطلب من جديد.');
  }
  return receipt(order);
}

export async function createOrder(input, key) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) {
    throw new HttpError(400, 'معرّف محاولة الطلب غير صحيح.');
  }

  const order = normalizeOrder(input);
  const hash = createHash('sha256').update(JSON.stringify(order)).digest('hex');
  const existing = findOrder.get(key);
  if (existing) return { order: checkRetry(existing, hash), replayed: true };

  const product = (await readProducts()).find((item) => item.id === order.productId);
  if (!product) throw new HttpError(404, 'المجسم مش متاح حاليًا.');

  const unitPrice = Math.round(product.price * 100);
  if (!Number.isSafeInteger(unitPrice) || unitPrice < 0 || !Number.isSafeInteger(unitPrice * order.quantity)) {
    throw new HttpError(503, 'سعر المجسم مش متاح حاليًا.');
  }

  if (input.expectedUnitPrice !== undefined &&
      (typeof input.expectedUnitPrice !== 'number' || Math.round(input.expectedUnitPrice * 100) !== unitPrice)) {
    throw new HttpError(409, 'سعر المجسم اتغيّر. حدّث الصفحة وراجع السعر قبل تأكيد الطلب.');
  }

  const id = 'SCN-' + randomUUID();
  insertOrder.run(
    id, key, hash, new Date().toISOString(),
    product.id, product.name, order.quantity,
    unitPrice, unitPrice * order.quantity,
    order.name, order.phone, order.address, order.notes, 'pending',
  );

  const saved = findOrder.get(key);
  return {
    order: checkRetry(saved, hash),
    replayed: saved.id !== id,
  };
}


