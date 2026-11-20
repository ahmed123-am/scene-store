import { HttpError } from './errors.js';

export function usesSupabase() {
  const configured = Boolean(
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_SECRET_KEY ||
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  );
  if ((process.env.VERCEL || process.env.NETLIFY || process.env.AWS_LAMBDA_FUNCTION_NAME) && !configured) {
    throw new HttpError(503, 'قاعدة البيانات لسه مش متصلة.');
  }
  return configured;
}

export async function supabaseRequest(path, options = {}) {
  return request('/rest/v1/', path, options);
}

export async function supabaseStorageRequest(path, options = {}) {
  return request('/storage/v1/', path, options);
}

async function request(prefix, path, options) {
  const base = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!base || !key) throw new HttpError(503, 'إعدادات قاعدة البيانات غير مكتملة.');

  const url = new URL(base);
  if (url.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(url.hostname)) {
    throw new HttpError(503, 'إعدادات قاعدة البيانات غير صحيحة.');
  }

  const headers = { apikey: key, ...options.headers };
  if (!key.startsWith('sb_secret_')) headers.Authorization = 'Bearer ' + key;

  let response;
  try {
    response = await fetch(new URL(prefix + path, url), {
      ...options,
      headers,
      signal: AbortSignal.timeout(12000),
    });
  } catch {
    throw new HttpError(503, 'تعذّر الاتصال بقاعدة البيانات. حاول تاني.');
  }

  if (!response.ok) {
    throw new HttpError(503, 'خدمة البيانات مش متاحة حاليًا. حاول تاني.');
  }
  if (response.status === 204) return null;
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
