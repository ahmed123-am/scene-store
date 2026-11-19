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

export function normalizeCartOrder(input) {
  if (!input || !Array.isArray(input.items) || input.items.length < 1 || input.items.length > 20) {
    throw new HttpError(400, 'السلة لازم تحتوي من منتج واحد لـ٢٠ منتج مختلف.');
  }
  const seen = new Set();
  let totalQuantity = 0;
  const items = input.items.map(item => {
    if (!item || typeof item !== 'object') throw new HttpError(400, 'راجع منتجات السلة.');
    const productId = text(item.productId, 'المجسم', 1, 120);
    if (seen.has(productId)) throw new HttpError(400, 'المنتج متكرر في السلة. اجمع كميته في سطر واحد.');
    seen.add(productId);
    if (!Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw new HttpError(400, 'راجع كميات المنتجات.');
    totalQuantity += item.quantity;
    let expectedPriceCents = null;
    if (item.expectedUnitPrice !== undefined) {
      expectedPriceCents = Math.round(item.expectedUnitPrice * 100);
      if (typeof item.expectedUnitPrice !== 'number' || !Number.isSafeInteger(expectedPriceCents) || expectedPriceCents < 0) {
        throw new HttpError(400, 'السعر المتوقع غير صحيح.');
      }
    }
    return { productId, quantity: item.quantity, expectedPriceCents };
  }).sort((a, b) => a.productId < b.productId ? -1 : a.productId > b.productId ? 1 : 0);
  if (totalQuantity > 50) throw new HttpError(400, 'الحد الأقصى للطلب ٥٠ قطعة.');
  const customer = normalizeOrder({ ...input, productId: items[0].productId, quantity: 1 });
  return { items, name: customer.name, phone: customer.phone, address: customer.address, notes: customer.notes };
}

export function cartFingerprint(order) {
  return JSON.stringify({ ...order, items: order.items.map(({ productId, quantity }) => ({ productId, quantity })) });
}


