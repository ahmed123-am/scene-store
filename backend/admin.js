import { HttpError } from './errors.js';
import { supabaseRequest } from './supabase.js';

const cookieName = 'scene_admin';
const statuses = ['pending', 'confirmed', 'shipped', 'completed', 'cancelled'];

function configuration() {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const userId = process.env.ADMIN_USER_ID;
  if (!base || !key || !userId) throw new HttpError(503, 'دخول الإدارة لسه محتاج تفعيل.');
  const url = new URL(base);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new HttpError(503, 'إعدادات الإدارة غير صحيحة.');
  }
  return { base, key, userId };
}

async function authRequest(path, options = {}) {
  const { base, key } = configuration();
  let response;
  try {
    response = await fetch(new URL('/auth/v1/' + path, base), {
      ...options,
      headers: { apikey: key, 'Content-Type': 'application/json', ...options.headers },
      signal: AbortSignal.timeout(10000),
    });
  } catch {
    throw new HttpError(503, 'تعذّر الاتصال بخدمة تسجيل الدخول.');
  }
  if (!response.ok) {
    if (response.status === 429) throw new HttpError(429, 'محاولات كتير. انتظر شوية وجرب تاني.');
    if (response.status >= 500) throw new HttpError(503, 'خدمة تسجيل الدخول غير متاحة حاليًا.');
    throw new HttpError(401, 'راجع بيانات الدخول أو سجّل دخولك من جديد.');
  }
  return response.status === 204 ? null : response.json();
}

function sessionToken(request) {
  const item = (request.headers.cookie || '').split(';').map(x => x.trim()).find(x => x.startsWith(cookieName + '='));
  const value = item?.slice(cookieName.length + 1);
  if (!value || !/^[A-Za-z0-9_.-]{20,3500}$/.test(value)) throw new HttpError(401, 'سجّل دخولك عشان تفتح الإدارة.');
  return value;
}

export function checkAdminOrigin(request) {
  let origin;
  try { origin = new URL(request.headers.origin); } catch { throw new HttpError(403, 'مصدر الطلب غير مسموح.'); }
  const host = request.headers.host;
  const local = process.env.VERCEL ? false : ['localhost', '127.0.0.1'].includes(origin.hostname);
  if (origin.host !== host || (!local && origin.protocol !== 'https:')) {
    throw new HttpError(403, 'مصدر الطلب غير مسموح.');
  }
}

export async function requireAdmin(request) {
  const token = sessionToken(request);
  const user = await authRequest('user', { headers: { Authorization: 'Bearer ' + token } });
  if (user.id !== configuration().userId) throw new HttpError(403, 'الحساب ده مش مصرح له بدخول الإدارة.');
  return { id: user.id, email: user.email };
}

function cookie(value, age) {
  return `${cookieName}=${value}; Path=/api/admin; HttpOnly; SameSite=Strict; Max-Age=${age}${process.env.VERCEL ? '; Secure' : ''}`;
}

export async function loginAdmin(input) {
  if (!input || typeof input.email !== 'string' || input.email.length > 254 ||
      typeof input.password !== 'string' || input.password.length < 1 || input.password.length > 256) {
    throw new HttpError(400, 'اكتب الإيميل وكلمة المرور.');
  }
  const result = await authRequest('token?grant_type=password', {
    method: 'POST', body: JSON.stringify({ email: input.email.trim(), password: input.password }),
  });
  if (result.user?.id !== configuration().userId) throw new HttpError(403, 'الحساب ده مش مصرح له بدخول الإدارة.');
  if (typeof result.access_token !== 'string' || !/^[A-Za-z0-9_.-]{20,3500}$/.test(result.access_token)) {
    throw new HttpError(503, 'تعذّر إنشاء جلسة الدخول.');
  }
  return {
    user: { id: result.user.id, email: result.user.email },
    cookie: cookie(result.access_token, Math.max(1, Math.min(Number(result.expires_in) || 3600, 3600))),
  };
}

export async function logoutAdmin(request) {
  try {
    await authRequest('logout?scope=local', { method: 'POST', headers: { Authorization: 'Bearer ' + sessionToken(request) } });
  } catch { /* Always clear the browser cookie even when the session has expired. */ }
  return cookie('', 0);
}

export async function listAdminOrders(params) {
  const status = params.get('status') || '';
  const page = Number(params.get('page') || '0');
  if ((status && !statuses.includes(status)) || !Number.isSafeInteger(page) || page < 0 || page > 50000) {
    throw new HttpError(400, 'فلتر الطلبات غير صحيح.');
  }
  const query = new URLSearchParams({
    select: 'id,created_at,product_id,product_name,quantity,unit_price_cents,subtotal_cents,customer_name,phone,address,notes,status',
    order: 'created_at.desc,id.desc', limit: '21', offset: String(page * 20),
  });
  if (status) query.set('status', 'eq.' + status);
  const rows = await supabaseRequest('orders?' + query);
  return { orders: rows.slice(0, 20), hasMore: rows.length > 20, page };
}

export async function updateAdminStatus(input) {
  if (!input || typeof input.id !== 'string' || !/^SCN-[A-Za-z0-9-]{1,100}$/.test(input.id) ||
      !statuses.includes(input.status) || !statuses.includes(input.previousStatus)) {
    throw new HttpError(400, 'راجع رقم الطلب وحالته.');
  }
  const query = new URLSearchParams({ id: 'eq.' + input.id, status: 'eq.' + input.previousStatus, select: 'id,status' });
  const rows = await supabaseRequest('orders?' + query, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json', Prefer: 'return=representation' },
    body: JSON.stringify({ status: input.status }),
  });
  if (!rows?.length) throw new HttpError(409, 'الطلب اتغيّر في مكان تاني. حدّث القائمة وراجع حالته.');
  return rows[0];
}
