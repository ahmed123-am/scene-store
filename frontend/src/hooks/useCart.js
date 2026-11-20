import { useCallback, useEffect, useReducer, useRef } from 'react';
import { getProducts } from '../api/products.js';

const key = 'scene-cart-v1';
function initial() {
  try {
    const saved = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(saved) || saved.length > 20) throw new Error();
    const seen = new Set();
    const items = saved.map(item => {
      if (typeof item?.id !== 'string' || item.id.length > 120 || seen.has(item.id) || !Number.isInteger(item.quantity) || item.quantity < 1 || item.quantity > 50) throw new Error();
      seen.add(item.id);
      return { id: item.id, quantity: item.quantity, name: 'منتج محتاج تحديث', price: 0, image: '/brand/s-mark.svg', unavailable: true };
    });
    if (items.reduce((sum, item) => sum + item.quantity, 0) > 50) throw new Error();
    return { items, notice: '' };
  } catch { return { items: [], notice: '' }; }
}
function reducer(state, action) {
  const items = state.items;
  if (action.type === 'clear') return { items: [], notice: '' };
  if (action.type === 'refresh') {
    let changed = false;
    const updated = items.map(item => {
      const live = action.products.find(product => product.id === item.id);
      if (!live) { changed = true; return { ...item, unavailable: true }; }
      if (item.price !== live.price || item.unavailable) changed = true;
      return { ...live, quantity: item.quantity, unavailable: false };
    });
    return { items: updated, notice: changed ? 'بيانات السلة اتحدثت. راجع الأسعار والمنتجات قبل التأكيد.' : state.notice };
  }
  if (action.type === 'add') {
    if (items.reduce((sum, item) => sum + item.quantity, 0) >= 50) return { ...state, notice: 'الحد الأقصى للطلب ٥٠ قطعة.' };
    const existing = items.find(item => item.id === action.product.id);
    if (!existing && items.length >= 20) return { ...state, notice: 'الحد الأقصى للسلة ٢٠ منتج مختلف.' };
    return { items: existing ? items.map(item => item.id === existing.id ? { ...action.product, quantity: item.quantity + 1, unavailable: false } : item) : [...items, { ...action.product, quantity: 1, unavailable: false }], notice: 'ضفنا «' + action.product.name + '» للسلة.' };
  }
  if (action.type === 'remove') return { items: items.filter(item => item.id !== action.id), notice: '' };
  if (action.type === 'quantity') {
    if (!Number.isInteger(action.quantity) || action.quantity < 1 || action.quantity > 50) return state;
    const next = items.map(item => item.id === action.id ? { ...item, quantity: action.quantity } : item);
    if (next.reduce((sum, item) => sum + item.quantity, 0) > 50) return { ...state, notice: 'الحد الأقصى للطلب ٥٠ قطعة.' };
    return { items: next, notice: '' };
  }
  return state;
}
export function useCart() {
  const [state, dispatch] = useReducer(reducer, undefined, initial);
  const version = useRef(0);
  const refresh = useCallback(async () => {
    const current = ++version.current;
    const products = await getProducts(AbortSignal.timeout(12000));
    if (current === version.current) dispatch({ type: 'refresh', products });
  }, []);
  useEffect(() => { refresh().catch(() => {}); }, [refresh]);
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(state.items.map(({ id, quantity }) => ({ id, quantity })))); } catch { /* Storage is optional. */ }
  }, [state.items]);
  return { ...state, refresh, add: product => dispatch({ type: 'add', product }), remove: id => dispatch({ type: 'remove', id }), quantity: (id, quantity) => dispatch({ type: 'quantity', id, quantity }), clear: () => dispatch({ type: 'clear' }) };
}
