import { randomUUID } from 'node:crypto';
import { HttpError } from './errors.js';
import { supabaseRequest, supabaseStorageRequest } from './supabase.js';

const select = 'id,name,price_cents,image,hero_image,position,active,revision';
function productId(value) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{1,100}$/.test(value)) throw new HttpError(400, 'معرّف المنتج غير صحيح.');
  return value;
}
function revision(value) {
  if (!Number.isSafeInteger(value) || value < 1 || value > 2147483646) throw new HttpError(400, 'حدّث المنتجات وافتح المنتج من جديد.');
  return value;
}
function imageUrl(value, optional = false) {
  if (optional && !value) return null;
  if (typeof value !== 'string' || value.length > 1500) throw new HttpError(400, 'راجع رابط الصورة.');
  const clean = value.trim();
  if (/^\/products\/[a-zA-Z0-9._-]+\.(png|webp|jpe?g)$/i.test(clean)) return clean;
  try {
    const url = new URL(clean);
    if (url.protocol === 'https:' && !url.username && !url.password && !url.hash) return url.href;
  } catch { /* Invalid URL */ }
  throw new HttpError(400, 'الصورة لازم تكون رابط HTTPS أو صورة من مجلد المنتجات.');
}
function fields(input) {
  if (!input || typeof input !== 'object') throw new HttpError(400, 'بيانات المنتج غير صحيحة.');
  const name = typeof input.name === 'string' ? input.name.trim() : '';
  const cents = Math.round(input.price * 100);
  if (name.length < 2 || name.length > 120) throw new HttpError(400, 'اسم المنتج من حرفين لـ١٢٠ حرف.');
  if (typeof input.price !== 'number' || !Number.isFinite(input.price) || cents < 0 || cents > 1000000000 || Math.abs(input.price * 100 - cents) > 0.00001) {
    throw new HttpError(400, 'اكتب سعرًا صحيحًا بالجنيه، بحد أقصى رقمين بعد الفاصلة.');
  }
  if (!Number.isInteger(input.position) || input.position < 0 || input.position > 10000 || typeof input.active !== 'boolean') {
    throw new HttpError(400, 'راجع ترتيب المنتج وحالة عرضه.');
  }
  return { name, price_cents: cents, image: imageUrl(input.image), hero_image: imageUrl(input.heroImage, true), position: input.position, active: input.active };
}

export async function listAdminProducts() {
  // No arbitrary query parameters are passed through to the database.
  const products = await supabaseRequest('products?' + new URLSearchParams({ select, order: 'position.asc,id.asc', limit: '1000' }));
  return { products };
}

export async function saveAdminProduct(input) {
  const product = fields(input);
  const id = productId(input.id);
  if (input.create === true) {
    if (!/^product-[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, 'معرّف المنتج الجديد غير صحيح.');
    const rows = await supabaseRequest('products?' + new URLSearchParams({ on_conflict: 'id', select }), {
      method: 'POST', headers: { 'Content-Type': 'application/json', Prefer: 'resolution=ignore-duplicates,return=representation' },
      body: JSON.stringify({ id, ...product }),
    });
    if (rows.length) return rows[0];
    const existing = await supabaseRequest('products?' + new URLSearchParams({ id: 'eq.' + id, select }));
    if (existing.length && Object.entries(product).every(([key, value]) => existing[0][key] === value)) return existing[0];
    throw new HttpError(409, 'المنتج ده اتضاف بالفعل ببيانات مختلفة. حدّث القائمة.');
  }
  const previous = revision(input.revision);
  const rows = await supabaseRequest('products?' + new URLSearchParams({ id: 'eq.' + id, revision: 'eq.' + previous, select }), {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ ...product, revision: previous + 1 }),
  });
  if (!rows.length) throw new HttpError(409, 'المنتج اتغيّر أو اتحذف. حدّث القائمة قبل التعديل.');
  return rows[0];
}

export async function deleteAdminProduct(input) {
  const id = productId(input?.id);
  const previous = revision(input?.revision);
  const rows = await supabaseRequest('products?' + new URLSearchParams({ id: 'eq.' + id, revision: 'eq.' + previous, select: 'id' }), {
    method: 'DELETE', headers: { Prefer: 'return=representation' },
  });
  if (!rows.length) throw new HttpError(409, 'المنتج اتغيّر أو اتحذف. حدّث القائمة قبل الحذف.');
  return { deleted: true, id };
}

export async function uploadAdminProductImage(input) {
  const data = input?.data;
  if (typeof data !== 'string' || data.length > 2100000 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) {
    throw new HttpError(400, 'ملف الصورة غير صحيح أو أكبر من المسموح.');
  }
  const image = Buffer.from(data, 'base64');
  if (image.length < 16 || image.length > 1572864 || image.toString('base64') !== data ||
      image.toString('ascii', 0, 4) !== 'RIFF' || image.toString('ascii', 8, 12) !== 'WEBP') {
    throw new HttpError(400, 'ارفع صورة WebP صحيحة أصغر من ١٫٥ ميجابايت.');
  }
  const path = 'products/' + randomUUID() + '.webp';
  await supabaseStorageRequest('object/scene-products/' + path, {
    method: 'POST', headers: { 'Content-Type': 'image/webp', 'Cache-Control': '3600', 'x-upsert': 'false' }, body: image,
  });
  return { url: new URL('/storage/v1/object/public/scene-products/' + path, process.env.SUPABASE_URL).href };
}
