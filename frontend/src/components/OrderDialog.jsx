import React, { useEffect, useRef, useState } from 'react';
import { submitOrder } from '../api/orders.js';

const money = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
});

export default function OrderDialog({ product, onClose }) {
  const dialogRef = useRef(null);
  const formRef = useRef(null);
  const receiptRef = useRef(null);
  const attemptRef = useRef(null);
  const controllerRef = useRef(null);
  const previousProduct = useRef(null);

  const [quantity, setQuantity] = useState('1');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [receipt, setReceipt] = useState(null);

  useEffect(() => {
    const dialog = dialogRef.current;

    if (product) {
      if (previousProduct.current !== product.id) {
        formRef.current?.reset();
        setQuantity('1');
        setReceipt(null);
        setError('');
        attemptRef.current = null;
        previousProduct.current = product.id;
      }
      if (!dialog.open) dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [product]);

  useEffect(() => {
    if (receipt) receiptRef.current?.focus();
  }, [receipt]);

  useEffect(() => () => controllerRef.current?.abort(), []);

  function closeDialog() {
    if (submitting) return;
    if (receipt) {
      setReceipt(null);
      attemptRef.current = null;
      previousProduct.current = null;
    }
    dialogRef.current.close();
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (submitting || !product) return;

    const data = new FormData(event.currentTarget);
    const payload = {
      productId: product.id,
      expectedUnitPrice: product.price,
      quantity: Number(quantity),
      name: data.get('name'),
      phone: data.get('phone'),
      address: data.get('address'),
      notes: data.get('notes'),
    };

    const fingerprint = JSON.stringify(payload);
    if (attemptRef.current?.fingerprint !== fingerprint) {
      attemptRef.current = { fingerprint, key: crypto.randomUUID() };
    }

    setSubmitting(true);
    setError('');
    const controller = new AbortController();
    controllerRef.current = controller;
    const timeout = setTimeout(() => controller.abort(), 15000);

    try {
      const saved = await submitOrder(payload, attemptRef.current.key, controller.signal);
      setReceipt(saved);
    } catch (failure) {
      setError(controller.signal.aborted
        ? 'الاتصال أخد وقت طويل. اضغط تأكيد الطلب تاني بنفس البيانات.'
        : failure.message || 'تعذّر حفظ الطلب. حاول تاني.');
    } finally {
      clearTimeout(timeout);
      setSubmitting(false);
      controllerRef.current = null;
    }
  }

  return (
    <dialog
      className="order-dialog"
      ref={dialogRef}
      aria-labelledby="order-title"
      onClose={onClose}
      onCancel={(event) => {
        if (submitting) event.preventDefault();
        else if (receipt) {
          setReceipt(null);
          attemptRef.current = null;
          previousProduct.current = null;
        }
      }}
    >
      <div className="order-dialog-header">
        <span dir="ltr">SCÈNE</span>
        <button type="button" className="order-close" aria-label="إغلاق الطلب" onClick={closeDialog} disabled={submitting}>×</button>
      </div>

      {receipt ? (
        <div className="order-receipt">
          <span className="receipt-check" aria-hidden="true">✓</span>
          <h2 id="order-title" ref={receiptRef} tabIndex="-1">استلمنا طلبك.</h2>
          <p>الطلب بانتظار التأكيد من فريق سين.</p>
          <div className="receipt-number">
            <span>رقم الطلب</span>
            <strong dir="ltr">{receipt.id}</strong>
          </div>
          <dl className="receipt-summary">
            <div><dt>المجسم</dt><dd>{receipt.productName}</dd></div>
            <div><dt>الكمية</dt><dd>{receipt.quantity}</dd></div>
            <div><dt>قيمة المنتجات</dt><dd>{money.format(receipt.subtotal)}</dd></div>
          </dl>
          <p className="order-shipping-note">تكلفة الشحن وطريقة الدفع بيتحددوا عند تأكيد الطلب.</p>
          <button className="order-submit" type="button" onClick={closeDialog}>كمّل تصفّح المجسمات ↖</button>
        </div>
      ) : (
        <>
          <h2 id="order-title">قطعتك قربت تبقى ليك.</h2>
          {product && (
            <div className="order-product">
              <img src={product.heroImage || product.image} alt="" />
              <div><h3>{product.name}</h3><p>{money.format(product.price)} للقطعة</p></div>
            </div>
          )}

          <form ref={formRef} onSubmit={handleSubmit}>
            <fieldset disabled={submitting}>
              <div className="order-form-grid">
                <label>الاسم
                  <input name="name" autoComplete="name" required minLength="2" maxLength="100" placeholder="اسمك بالكامل" />
                </label>
                <label>رقم الموبايل
                  <input name="phone" type="tel" autoComplete="tel" required minLength="8" maxLength="30" placeholder="رقم نقدر نتواصل معاك عليه" />
                </label>
                <label className="order-full-width">العنوان بالتفصيل
                  <textarea name="address" autoComplete="street-address" required minLength="10" maxLength="500" rows="2" placeholder="المحافظة، المنطقة، الشارع، رقم العمارة والشقة" />
                </label>
                <label>الكمية
                  <input name="quantity" type="number" min="1" max="50" step="1" required value={quantity} onChange={(event) => setQuantity(event.target.value)} />
                </label>
                <div className="order-subtotal">
                  <span>قيمة المنتجات</span>
                  <strong>{money.format((product?.price ?? 0) * Number(quantity || 0))}</strong>
                </div>
                <label className="order-full-width">ملاحظات <span className="optional-label">(اختياري)</span>
                  <textarea name="notes" maxLength="1000" rows="2" placeholder="أي تفاصيل تحب تضيفها للطلب" />
                </label>
              </div>
              <p className="order-shipping-note">تكلفة الشحن وطريقة الدفع بيتحددوا عند تأكيد الطلب.</p>
              {error && <p className="order-error" role="alert">{error}</p>}
              <button className="order-submit" type="submit">{submitting ? 'بنحفظ طلبك…' : 'تأكيد الطلب ↙'}</button>
            </fieldset>
          </form>
        </>
      )}
    </dialog>
  );
}

