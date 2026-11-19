import React, { useEffect, useRef, useState } from 'react';
import { adminApi } from './api.js';
import { prepareProductImage } from './product-image.js';

const money = cents => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(cents / 100);

export default function Products({ onSessionExpired }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [refresh, setRefresh] = useState(0);
  const [search, setSearch] = useState('');
  const [view, setView] = useState('all');
  const [draft, setDraft] = useState(null);
  const [remove, setRemove] = useState(null);
  const [dialogError, setDialogError] = useState('');
  const [busy, setBusy] = useState(false);
  const [image, setImage] = useState(null);
  const editor = useRef(null);
  const deletion = useRef(null);
  const expire = useRef(onSessionExpired);
  expire.current = onSessionExpired;

  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setError('');
    adminApi('products', undefined, controller.signal).then(data => setProducts(data.products)).catch(failure => {
      if (controller.signal.aborted) return;
      setError(failure.message);
      if ([401, 403].includes(failure.status)) expire.current();
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [refresh]);

  useEffect(() => {
    if (draft && !editor.current.open) editor.current.showModal();
    if (!draft && editor.current.open) editor.current.close();
  }, [draft]);
  useEffect(() => {
    if (remove && !deletion.current.open) deletion.current.showModal();
    if (!remove && deletion.current.open) deletion.current.close();
  }, [remove]);

  function open(product) {
    setDialogError(''); setImage(null);
    setDraft(product ? { id: product.id, name: product.name, price: String(product.price_cents / 100), image: product.image, heroImage: product.hero_image || '', active: product.active, position: product.position, revision: product.revision, create: false } :
      { id: 'product-' + crypto.randomUUID(), name: '', price: '', image: '', heroImage: '', active: true, position: Math.min(10000, Math.max(0, ...products.map(item => item.position)) + 1), create: true });
  }
  function field(name, value) { setDraft(current => ({ ...current, [name]: value })); }

  async function chooseImage(event) {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;
    setBusy(true); setDialogError('');
    try { setImage(await prepareProductImage(file)); setDraft(current => ({ ...current, heroImage: '' })); }
    catch (failure) { setDialogError(failure.message || 'تعذّر فتح الصورة.'); }
    finally { setBusy(false); }
  }

  function handleFailure(failure) {
    setDialogError(failure.name === 'AbortError' ? 'الاتصال أخد وقت طويل. راجع القائمة قبل إعادة المحاولة.' : failure.message || 'تعذّر حفظ التغيير.');
    if ([401, 403].includes(failure.status)) expire.current();
  }

  async function save(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true); setDialogError(''); setNotice('');
    try {
      let mainImage = draft.image;
      if (image) {
        const uploaded = await adminApi('product-image', { data: image.data });
        mainImage = uploaded.url;
        setDraft(current => ({ ...current, image: mainImage }));
        setImage(null);
      }
      await adminApi('product-save', { ...draft, image: mainImage, price: Number(draft.price), position: Number(draft.position) });
      setNotice(draft.create ? 'المنتج اتضاف بنجاح.' : 'تم حفظ تعديلات المنتج.');
      setDraft(null); setRefresh(value => value + 1);
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(false); }
  }

  async function confirmDelete() {
    if (busy) return;
    setBusy(true); setDialogError(''); setNotice('');
    try {
      await adminApi('product-delete', { id: remove.id, revision: remove.revision });
      setNotice('تم حذف «' + remove.name + '». الطلبات القديمة محفوظة.');
      setRemove(null); setRefresh(value => value + 1);
    } catch (failure) { handleFailure(failure); }
    finally { setBusy(false); }
  }

  const visible = products.filter(product => product.name.toLocaleLowerCase('ar').includes(search.trim().toLocaleLowerCase('ar')) &&
    (view === 'all' || product.active === (view === 'active')));

  return (
    <section className="admin-content">
      <div className="admin-heading"><div><span className="admin-eyebrow">المجموعة بتاعتك</span><h1>مجسمات سين<span>.</span></h1><p>ضيف قطعة جديدة، ظبّط سعرها، وخلي مجموعتك دايمًا متجددة.</p></div><div className="admin-product-actions"><button disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>تحديث ↻</button><button className="admin-primary" onClick={() => open(null)}>إضافة منتج +</button></div></div>
      <div className="admin-stats"><div><span>إجمالي المنتجات</span><strong>{loading ? '—' : products.length.toLocaleString('ar-EG')}</strong></div><div><span>ظاهر في المتجر</span><strong>{loading ? '—' : products.filter(item => item.active).length.toLocaleString('ar-EG')}</strong></div><div className="admin-stat-accent"><span>مخفي مؤقتًا</span><strong>{loading ? '—' : products.filter(item => !item.active).length.toLocaleString('ar-EG')}</strong></div></div>
      <div className="admin-product-filters"><label>ابحث باسم المنتج<input type="search" value={search} onChange={event => setSearch(event.target.value)} placeholder="بتدور على أنهي مجسم؟" /></label><label>حالة العرض<select value={view} onChange={event => setView(event.target.value)}><option value="all">كل المنتجات</option><option value="active">ظاهر في المتجر</option><option value="hidden">مخفي مؤقتًا</option></select></label></div>
      {notice && <p className="admin-notice" role="status">✓ {notice}</p>}
      {error && <p className="admin-error" role="alert">{error}</p>}
      {loading ? <p className="admin-empty" role="status">بنحمّل المنتجات…</p> : error ? <div className="admin-empty"><h2>تعذّر تحميل المنتجات</h2><p>راجع الاتصال وتأكد من تشغيل ملف إعداد إدارة المنتجات.</p></div> : !visible.length ? <div className="admin-empty"><span>◇</span><h2>مفيش منتجات هنا</h2><p>{search || view !== 'all' ? 'جرّب تغيّر البحث أو الفلتر.' : 'ابدأ بإضافة أول قطعة في مجموعتك.'}</p></div> : <div className="admin-product-grid">{visible.map(product => <article className="admin-product-card" key={product.id}><div className="admin-product-photo"><img src={product.hero_image || product.image} alt={product.name} loading="lazy" referrerPolicy="no-referrer" /><span className={'admin-badge ' + (product.active ? 'status-completed' : 'status-cancelled')}>{product.active ? 'ظاهر' : 'مخفي'}</span></div><div className="admin-product-info"><h2>{product.name}</h2><div><strong>{money(product.price_cents)}</strong><small>الترتيب: {product.position}</small></div><div className="admin-product-buttons"><button onClick={() => open(product)} aria-label={'تعديل ' + product.name}>تعديل ↖</button><button className="admin-delete" aria-label={'حذف ' + product.name} onClick={() => { setDialogError(''); setRemove(product); }}>حذف</button></div></div></article>)}</div>}

      <dialog ref={editor} className="admin-dialog admin-product-editor" aria-labelledby="product-edit-title" onClose={() => { if (!busy) setDraft(null); }} onCancel={event => { if (busy) event.preventDefault(); }}>
        {draft && <><div className="admin-dialog-top"><span>استوديو المنتجات</span><button disabled={busy} aria-label="إغلاق تعديل المنتج" onClick={() => setDraft(null)}>×</button></div><h2 id="product-edit-title">{draft.create ? 'قطعة جديدة في سين.' : 'ظبّط تفاصيل قطعتك.'}</h2><form className="admin-product-form" onSubmit={save}><fieldset disabled={busy}>
          <div className="admin-upload-preview">{image?.preview || draft.image ? <img src={image?.preview || draft.image} alt="معاينة صورة المنتج" referrerPolicy="no-referrer" /> : <span>◇<small>صورة تليق بقطعتك</small></span>}</div>
          <label className="admin-upload-button">اختار صورة من جهازك<input type="file" accept="image/png,image/jpeg,image/webp" onChange={chooseImage} /></label><p className="admin-status-hint">JPG / PNG / WebP · حتى ١٥ ميجابايت. بنصغّرها تلقائيًا قبل الرفع.</p>
          {image && <p className="admin-notice">الصورة جاهزة، هتترفع عند حفظ المنتج. <button type="button" onClick={() => setImage(null)}>إلغاء الصورة</button></p>}
          <div className="admin-product-form-grid"><label className="admin-field-full">اسم المنتج<input required minLength="2" maxLength="120" value={draft.name} onChange={event => field('name', event.target.value)} /></label><label>السعر بالجنيه<input type="number" min="0" max="10000000" step="0.01" required value={draft.price} onChange={event => field('price', event.target.value)} /></label><label>ترتيب العرض<input type="number" min="0" max="10000" step="1" required value={draft.position} onChange={event => field('position', event.target.value)} /></label><label className="admin-field-full">رابط الصورة الأساسية<input dir="ltr" maxLength="1500" required={!image} value={draft.image} disabled={Boolean(image)} onChange={event => field('image', event.target.value)} placeholder="https://… أو /products/image.webp" /></label><label className="admin-field-full">رابط صورة العرض المجسّمة (اختياري)<input dir="ltr" maxLength="1500" value={draft.heroImage} onChange={event => field('heroImage', event.target.value)} placeholder="سيبه فاضي لاستخدام الصورة الأساسية" /></label><label className="admin-check admin-field-full"><input type="checkbox" checked={draft.active} onChange={event => field('active', event.target.checked)} />ظاهر في المتجر ومتاح للطلب</label></div>
          <p className="admin-status-hint">الترتيب الأقل يظهر الأول. تقدر تخفي المنتج مؤقتًا بدل حذفه.</p>
          {dialogError && <p className="admin-error" role="alert">{dialogError}</p>}
          <div className="admin-form-buttons"><button className="admin-primary" type="submit">{busy ? 'بنحفظ المنتج…' : 'حفظ المنتج ↖'}</button><button type="button" onClick={() => setDraft(null)}>إلغاء</button></div>
        </fieldset></form></>}
      </dialog>

      <dialog ref={deletion} className="admin-dialog" aria-labelledby="product-delete-title" onClose={() => { if (!busy) setRemove(null); }} onCancel={event => { if (busy) event.preventDefault(); }}>
        {remove && <><div className="admin-dialog-top"><span>حذف منتج</span><button disabled={busy} aria-label="إغلاق تأكيد الحذف" onClick={() => setRemove(null)}>×</button></div><h2 id="product-delete-title">نحذف «{remove.name}»؟</h2><p className="admin-delete-explanation">المنتج هيتشال من المتجر ومن قائمة المنتجات. الطلبات القديمة وأسعارها هتفضل محفوظة. الحذف لا يمكن التراجع عنه من اللوحة.</p><p className="admin-status-hint">لو عاوز توقفه مؤقتًا، افتح تعديل وشيل علامة «ظاهر في المتجر».</p>{dialogError && <p className="admin-error" role="alert">{dialogError}</p>}<div className="admin-form-buttons"><button className="admin-delete-confirm" disabled={busy} onClick={confirmDelete}>{busy ? 'بنحذف…' : 'تأكيد حذف المنتج'}</button><button disabled={busy} onClick={() => setRemove(null)}>إلغاء الحذف</button></div></>}
      </dialog>
    </section>
  );
}
