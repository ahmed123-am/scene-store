import { createHash, createHmac } from 'node:crypto';
import { HttpError } from './errors.js';
import { normalizeOrder } from './order-validation.js';
import { supabaseRequest, supabaseStorageRequest } from './supabase.js';

const statuses = ['pending', 'reviewing', 'contacted', 'cancelled'];
function text(value, min, max) {
  if (typeof value !== 'string' || value.trim().length < min || value.trim().length > max) throw new HttpError(400, 'راجع وصف الشكل والمقاسات.');
  return value.trim();
}
export function decodeCustomImage(data) {
  if (typeof data !== 'string' || data.length > 2097152 || !/^[A-Za-z0-9+/]+={0,2}$/.test(data)) throw new HttpError(400, 'راجع ملف الصورة وحجمه.');
  const bytes = Buffer.from(data, 'base64');
  if (bytes.length < 16 || bytes.length > 1572864 || bytes.toString('base64') !== data || bytes.toString('ascii',0,4) !== 'RIFF' || bytes.toString('ascii',8,12) !== 'WEBP') throw new HttpError(400, 'اختار صورة صالحة للطلب المخصص.');
  return bytes;
}

export async function createCustomRequest(input, key, request) {
  if (typeof key !== 'string' || !/^[A-Za-z0-9_-]{16,100}$/.test(key)) throw new HttpError(400, 'معرّف محاولة الطلب غير صحيح.');
  if (!input || input.website) throw new HttpError(400, 'راجع بيانات الطلب.');
  const customer = normalizeOrder({ ...input, productId: 'custom', address: 'طلب مخصص قبل تحديد الشحن' });
  const bytes = decodeCustomImage(input.image);
  const details = { name: customer.name, phone: customer.phone, quantity: customer.quantity, description: text(input.description,10,2000), dimensions: text(input.dimensions || '',0,200) };
  const hash = createHash('sha256').update(JSON.stringify(details)).update(bytes).digest('hex');
  const secret = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!secret) throw new HttpError(503, 'الطلبات المخصصة لسه محتاجة تفعيل.');
  const ip = process.env.VERCEL ? String(request.headers['x-vercel-forwarded-for'] || request.headers['x-forwarded-for'] || request.socket?.remoteAddress || 'unknown').split(',')[0].trim() : request.socket?.remoteAddress || 'local';
  const ipHash = createHmac('sha256', secret).update('custom-request:' + ip).digest('hex');
  const reserved = await supabaseRequest('rpc/reserve_scene_custom_request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_key: key, p_hash: hash, p_ip_hash: ipHash, p_request: details }),
  });
  if (reserved.error) throw new HttpError(reserved.status, reserved.error);
  if (reserved.ready) return { receipt: reserved.receipt, replayed: true };
  await supabaseStorageRequest('object/scene-custom-requests/' + reserved.imagePath, {
    method: 'POST', headers: { 'Content-Type': 'image/webp', 'x-upsert': 'true' }, body: bytes,
  });
  const completed = await supabaseRequest('rpc/complete_scene_custom_request', {
    method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ p_key: key, p_hash: hash }),
  });
  if (completed.error) throw new HttpError(completed.status, completed.error);
  return { ...completed, details };
}

export async function listCustomRequests(params) {
  const page = Number(params.get('page') || 0);
  const status = params.get('status') || '';
  if (!Number.isSafeInteger(page) || page < 0 || page > 50000 || (status && !statuses.includes(status))) throw new HttpError(400, 'فلتر الطلبات غير صحيح.');
  const query = new URLSearchParams({ select:'id,created_at,customer_name,phone,quantity,description,dimensions,status', upload_state:'eq.ready', order:'created_at.desc,id.desc', offset:String(page*20), limit:'21' });
  if (status) query.set('status','eq.' + status);
  const rows = await supabaseRequest('custom_requests?' + query);
  return { requests: rows.slice(0,20), hasMore:rows.length > 20 };
}

function requestId(id) {
  if (typeof id !== 'string' || !/^SCN-C-[a-f0-9-]{36}$/.test(id)) throw new HttpError(400, 'رقم الطلب غير صحيح.');
  return id;
}
export async function customRequestDetail(id) {
  requestId(id);
  const rows = await supabaseRequest('custom_requests?' + new URLSearchParams({ id:'eq.' + id, upload_state:'eq.ready', select:'id,created_at,customer_name,phone,quantity,description,dimensions,status,image_path' }));
  if (!rows.length) throw new HttpError(404,'الطلب غير موجود.');
  const row = rows[0];
  const signed = await supabaseStorageRequest('object/sign/scene-custom-requests/' + row.image_path, { method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({expiresIn:300}) });
  const { image_path, ...details } = row;
  const path = signed.signedURL || signed.signedUrl;
  if (!path?.startsWith('/object/sign/scene-custom-requests/')) throw new HttpError(503,'تعذّر عرض الصورة. جرّب فتح الطلب من جديد.');
  return { ...details, imageUrl:new URL('/storage/v1' + path,process.env.SUPABASE_URL).href };
}
export async function updateCustomStatus(input) {
  const id = requestId(input?.id);
  if (!statuses.includes(input?.status) || !statuses.includes(input?.previousStatus)) throw new HttpError(400,'حالة الطلب غير صحيحة.');
  const rows = await supabaseRequest('custom_requests?' + new URLSearchParams({ id:'eq.' + id, status:'eq.' + input.previousStatus, upload_state:'eq.ready', select:'id,status' }), {
    method:'PATCH', headers:{'Content-Type':'application/json',Prefer:'return=representation'}, body:JSON.stringify({status:input.status}),
  });
  if (!rows.length) throw new HttpError(409,'الطلب اتغيّر. حدّث القائمة وراجع حالته.');
  return rows[0];
}
