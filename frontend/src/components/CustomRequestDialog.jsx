import React, { useEffect, useRef, useState } from 'react';
import { prepareImage } from '../utils/prepareImage.js';

export default function CustomRequestDialog({ open, onClose }) {
  const dialog = useRef(null);
  const attempt = useRef(null);
  const pending = useRef(null);
  const heading = useRef(null);
  const [image,setImage] = useState(null);
  const [busy,setBusy] = useState(false);
  const [preparing,setPreparing] = useState(false);
  const [error,setError] = useState('');
  const [receipt,setReceipt] = useState(null);
  useEffect(() => {
    if (open) { setError(''); setReceipt(null); if (!dialog.current.open) dialog.current.showModal(); }
    else if (dialog.current.open) dialog.current.close();
  },[open]);
  useEffect(() => { if (receipt) heading.current?.focus(); },[receipt]);
  useEffect(() => () => pending.current?.abort(),[]);
  async function choose(event) {
    const file=event.target.files?.[0]; event.target.value='';
    if (!file) return;
    setPreparing(true); setError('');
    try { setImage(await prepareImage(file)); }
    catch (failure) { setError(failure.message || 'تعذّر تجهيز الصورة. جرّب صورة تانية.'); }
    finally { setPreparing(false); }
  }
  async function submit(event) {
    event.preventDefault();
    if (busy || preparing) return;
    if (!image) { setError('اختار صورة الشكل اللي حابب نعمله.'); return; }
    const data=new FormData(event.currentTarget);
    const body={name:data.get('name'),phone:data.get('phone'),quantity:Number(data.get('quantity')),description:data.get('description'),dimensions:data.get('dimensions'),image:image.data,website:data.get('website')};
    const fingerprint=JSON.stringify(body);
    if (attempt.current?.fingerprint !== fingerprint) attempt.current={fingerprint,key:crypto.randomUUID()};
    setBusy(true);setError('');
    const controller=new AbortController();pending.current=controller;
    const timer=setTimeout(()=>controller.abort(),25000);
    try {
      const response=await fetch('/api/custom-orders',{method:'POST',headers:{'Content-Type':'application/json','Idempotency-Key':attempt.current.key},body:fingerprint,signal:controller.signal});
      const result=await response.json();
      if (!response.ok) throw new Error(result.error || 'تعذّر إرسال الطلب. حاول تاني.');
      setReceipt(result);setImage(null);attempt.current=null;
    } catch (failure) { setError(controller.signal.aborted ? 'الاتصال أخد وقت طويل. أعد الإرسال بنفس البيانات عشان نتجنب تكرار الطلب.' : failure.message); }
    finally {clearTimeout(timer);setBusy(false);pending.current=null;}
  }
  const locked=busy||preparing;
  return <dialog ref={dialog} className="order-dialog custom-request-dialog" aria-labelledby="custom-request-title" onClose={onClose} onCancel={event=>{if(locked)event.preventDefault();}}>
    <div className="order-dialog-header"><span dir="ltr">SCÈNE / CUSTOM</span><button type="button" className="order-close" disabled={locked} aria-label="إغلاق الطلب المخصص" onClick={onClose}>×</button></div>
    {receipt ? <div className="order-receipt"><span className="receipt-check">✦</span><h2 id="custom-request-title" ref={heading} tabIndex="-1">فكرتك وصلت لنا.</h2><p>هنراجع الصورة والتفاصيل، ونتواصل معاك بالسعر وإمكانية التنفيذ.</p><div className="receipt-number"><span>رقم الطلب المخصص</span><strong dir="ltr">{receipt.id}</strong></div><p className="order-shipping-note">التنفيذ بيبدأ بعد الاتفاق معاك على التفاصيل والسعر.</p><button type="button" className="order-submit" onClick={onClose}>ارجع للمجسمات ↖</button></div> : <>
      <span className="custom-dialog-eyebrow">من الصورة… لقطعة بإيدك</span><h2 id="custom-request-title">ورّينا اللي في بالك.</h2><p className="custom-dialog-description">ارفع صورة مرجعية، واحكيلنا عن الشكل. هنراجع طلبك ونحدد معاك السعر قبل التنفيذ.</p>
      <form onSubmit={submit}><fieldset disabled={locked}>
        <label className="custom-image-picker"><input type="file" accept="image/png,image/jpeg,image/webp" onChange={choose} aria-label="صورة الشكل المخصص" />{image ? <img src={image.preview} alt="معاينة الصورة المرجعية" /> : <><span aria-hidden="true">＋</span><strong>{preparing?'بنجهّز الصورة…':'ارفع صورة الشكل'}</strong><small>اضغط هنا لاختيار صورة من جهازك</small></>}</label>
        <p className="order-shipping-note">JPG / PNG / WebP · حتى ١٥ ميجابايت. الصورة بتظهر لفريق سين لمراجعة طلبك.</p>
        {image&&<div className="custom-image-tools"><span>الصورة جاهزة ✓</span><button type="button" onClick={()=>setImage(null)}>اختار صورة مختلفة</button></div>}
        <div className="order-form-grid"><label>اسمك<input name="name" required minLength="2" maxLength="100" autoComplete="name" /></label><label>رقم الموبايل<input name="phone" type="tel" required minLength="10" maxLength="30" autoComplete="tel" /></label><label>الكمية المطلوبة<input name="quantity" type="number" min="1" max="50" step="1" required defaultValue="1" /></label><label>المقاسات التقريبية (اختياري)<input name="dimensions" maxLength="200" placeholder="مثلًا: ارتفاع ١٥ سم" /></label><label className="order-full-width">احكيلنا عن الشكل<textarea name="description" required minLength="10" maxLength="2000" rows="3" placeholder="الألوان، الاستخدام، وأي تعديل عاوزه على الصورة…" /></label></div>
        <label className="custom-honeypot" aria-hidden="true">Website<input name="website" tabIndex="-1" autoComplete="off" /></label>
        {error&&<p className="order-error" role="alert">{error}</p>}<button type="submit" className="order-submit">{busy?'بنرسل فكرتك…':preparing?'بنجهّز الصورة…':'ابعت طلبك المخصص ↖'}</button>
      </fieldset></form>
    </>}
  </dialog>;
}
