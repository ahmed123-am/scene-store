import { HttpError } from './errors.js';
function text(value, label, minimum, maximum) {
  if (typeof value !== 'string') throw new HttpError(400, 'راجع ' + label + '.');
  const normalized = value.trim();
  if (normalized.length < minimum || normalized.length > maximum) {
    throw new HttpError(400, 'راجع ' + label + '.');
  }
  return normalized;
}

export function normalizeOrder(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new HttpError(400, 'بيانات الطلب غير صحيحة.');
  }
  const quantity = input.quantity;
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    throw new HttpError(400, 'الكمية لازم تكون من ١ لـ٥٠ قطعة.');
  }
  const phoneInput = text(input.phone, 'رقم الموبايل', 8, 30)
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)));
  if (!/^[+0-9 ()-]+$/.test(phoneInput)) {
    throw new HttpError(400, 'رقم الموبايل غير صحيح.');
  }
  const phone = phoneInput.replace(/[^0-9]/g, '');
  if (phone.length < 10 || phone.length > 15) {
    throw new HttpError(400, 'رقم الموبايل غير صحيح.');
  }
  return {
    productId: text(input.productId, 'المجسم', 1, 120),
    quantity,
    name: text(input.name, 'الاسم', 2, 100),
    phone,
    address: text(input.address, 'العنوان بالتفصيل', 10, 500),
    notes: text(input.notes ?? '', 'الملاحظات', 0, 1000),
  };
}


