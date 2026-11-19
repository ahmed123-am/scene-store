import React, { useEffect, useRef, useState } from 'react';
import { submitOrder } from '../api/orders.js';

const money = new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' });

export default function OrderDialog({ open, cart, onClose }) {
  const dialog = useRef(null);
  const receiptHeading = useRef(null);
  const attempt = useRef(null);
  const controller = useRef(null);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);
  const refresh = cart.refresh;

  useEffect(() => {
    if (open) {
      setReceipt(null); setError('');
      if (!dialog.current.open) dialog.current.showModal();
      setRefreshing(true);
      let active = true;
      refresh().catch(() => { if (active) setError('تعذّر تحديث السلة. جرّب تحديثها قبل تأكيد الطلب.'); }).finally(() => { if (active) setRefreshing(false); });
      return () => { active = false; };
    }
    if (dialog.current.open) dialog.current.close();
  }, [open, refresh]);
  useEffect(() => { if (receipt) receiptHeading.current?.focus(); }, [receipt]);
  useEffect(() => () => controller.current?.abort(), []);

  async function updateCart() {
    setRefreshing(true); setError('');
    try { await refresh(); }
    catch { setError('تعذّر تحديث السلة. حاول تاني.'); }
    finally { setRefreshing(false); }
  }
  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || refreshing || !cart.items.length || cart.items.some(item => item.unavailable)) return;
    const data = new FormData(event.currentTarget);
    const payload = {
      items: cart.items.map(item => ({ productId: item.id, quantity: item.quantity, expectedUnitPrice: item.price })),
      name: data.get('name'), phone: data.get('phone'), address: data.get('address'), notes: data.get('notes'),
    };
    const fingerprint = JSON.stringify(payload);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current = { fingerprint, key: crypto.randomUUID() };
    setSubmitting(true); setError('');
    const pending = new AbortController();
    controller.current = pending;
    const timeout = setTimeout(() => pending.abort(), 22000);
    try {
      const saved = await submitOrder(payload, attempt.current.key, pending.signal);
      setReceipt(saved); cart.clear(); attempt.current = null;
    } catch (failure) {
      setError(pending.signal.aborted ? 'الاتصال أخد وقت طويل. اضغط تأكيد الطلب تاني بنفس البيانات.' : failure.message || 'تعذّر حفظ الطلب. حاول تاني.');
    } finally { clearTimeout(timeout); setSubmitting(false); controller.current = null; }
  }

  const busy = submitting || refreshing;
  const subtotal = cart.items.reduce((sum, item) => sum + Math.round(item.price * 100) * item.quantity, 0) / 100;
  const count = cart.items.reduce((sum, item) => sum + item.quantity, 0);
  return (
    <dialog ref={dialog} className="order-dialog cart-dialog" aria-labelledby="order-title" onClose={onClose} onCancel={event => { if (busy) event.preventDefault(); }}>
      <div className="order-dialog-header"><span dir="ltr">SCÈNE</span><button type="button" className="order-close" aria-label="إغلاق السلة" disabled={busy} onClick={onClose}>×</button></div>
      {receipt ? <div className="order-receipt">
        <span className="receipt-check" aria-hidden="true">✓</span><h2 id="order-title" ref={receiptHeading} tabIndex="-1">استلمنا طلبك.</h2><p>كل القطع في أوردر واحد، بانتظار التأكيد من فريق سين.</p>
        <div className="receipt-number"><span>رقم الطلب</span><strong dir="ltr">{receipt.id}</strong></div>
        <ul className="cart-receipt-items">{(receipt.items || []).map(item => <li key={item.productId}><span>{item.productName} × {item.quantity}</span><strong>{money.format(item.subtotal)}</strong></li>)}</ul>
        <dl className="receipt-summary"><div><dt>إجمالي القطع</dt><dd>{receipt.quantity}</dd></div><div><dt>قيمة المنتجات</dt><dd>{money.format(receipt.subtotal)}</dd></div></dl>
        <p className="order-shipping-note">تكلفة الشحن وطريقة الدفع بيتحددوا عند تأكيد الطلب.</p><button className="order-submit" type="button" onClick={onClose}>كمّل تصفّح المجسمات ↖</button>
      </div> : <>
        <h2 id="order-title">قطعك المفضلة، في سلة واحدة.</h2>
        {!cart.items.length ? <div className="cart-empty"><span>◇</span><h3>لسه السلة فاضية.</h3><p>اختار المجسمات اللي تعجبك وضيفها هنا.</p><button className="order-submit" onClick={onClose}>شوف المجسمات ↖</button></div> : <>
          <div className="cart-summary-top"><span>{cart.items.length} منتج / {count} قطعة</span><button type="button" disabled={busy} onClick={updateCart}>{refreshing ? 'بنحدّث…' : 'تحديث السلة ↻'}</button></div>
          {cart.notice && <p className="cart-notice" role="status">{cart.notice}</p>}
          <ul className="cart-lines">{cart.items.map(item => <li key={item.id} className={item.unavailable ? 'cart-unavailable' : ''}>
            <img src={item.heroImage || item.image} alt="" /><div className="cart-line-info"><h3>{item.name}</h3><p>{item.unavailable ? 'غير متاح — احذفه عشان تكمل الطلب' : money.format(item.price) + ' للقطعة'}</p>
              <div className="cart-quantity"><button type="button" disabled={busy || item.quantity <= 1} aria-label={'تقليل كمية ' + item.name} onClick={() => cart.quantity(item.id, item.quantity - 1)}>−</button><label><span className="cart-sr-only">{'كمية ' + item.name}</span><input type="number" min="1" max="50" value={item.quantity} disabled={busy} onChange={event => cart.quantity(item.id, Number(event.target.value))} /></label><button type="button" disabled={busy || count >= 50} aria-label={'زيادة كمية ' + item.name} onClick={() => cart.quantity(item.id, item.quantity + 1)}>+</button></div>
            </div><div className="cart-line-end"><strong>{item.unavailable ? '—' : money.format(Math.round(item.price * 100) * item.quantity / 100)}</strong><button type="button" disabled={busy} aria-label={'حذف ' + item.name + ' من السلة'} onClick={() => cart.remove(item.id)}>إزالة</button></div>
          </li>)}</ul>
          <div className="cart-total"><span>قيمة المنتجات <small>بدون الشحن</small></span><strong>{money.format(subtotal)}</strong></div>
          <button className="cart-continue" type="button" disabled={busy} onClick={onClose}>ضيف منتجات تانية للسلة ↖</button>
          <form onSubmit={handleSubmit}><fieldset disabled={busy}><h3 className="cart-shipping-title">هنوصّل قطعك فين؟</h3><div className="order-form-grid">
            <label>الاسم<input name="name" autoComplete="name" required minLength="2" maxLength="100" placeholder="اسمك بالكامل" /></label>
            <label>رقم الموبايل<input name="phone" type="tel" autoComplete="tel" required minLength="8" maxLength="30" placeholder="رقم نقدر نتواصل معاك عليه" /></label>
            <label className="order-full-width">العنوان بالتفصيل<textarea name="address" autoComplete="street-address" required minLength="10" maxLength="500" rows="2" placeholder="المحافظة، المنطقة، الشارع، رقم العمارة والشقة" /></label>
            <label className="order-full-width">ملاحظات (اختياري)<textarea name="notes" maxLength="1000" rows="2" /></label>
          </div><p className="order-shipping-note">تكلفة الشحن وطريقة الدفع بيتحددوا عند تأكيد الطلب.</p>{error && <p className="order-error" role="alert">{error}</p>}<button className="order-submit" type="submit" disabled={cart.items.some(item => item.unavailable)}>{submitting ? 'بنحفظ طلبك…' : 'تأكيد طلب كل المنتجات ↙'}</button></fieldset></form>
        </>}
      </>}
    </dialog>
  );
}
