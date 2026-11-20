import React, { useEffect, useRef, useState } from 'react';
import './admin.css';
import { adminApi as api } from './api.js';
import Products from './Products.jsx';
import OrderItems from './OrderItems.jsx';
import CustomRequests from './CustomRequests.jsx';

const labels = { pending: 'جديد', confirmed: 'تم التأكيد', shipped: 'اتشحن', completed: 'اكتمل', cancelled: 'ملغي' };
const money = value => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP', maximumFractionDigits: 0 }).format(value / 100);
const date = value => new Intl.DateTimeFormat('ar-EG', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Africa/Cairo' }).format(new Date(value));

export default function Admin() {
  const [section, setSection] = useState('orders');
  const [session, setSession] = useState(undefined);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [orders, setOrders] = useState([]);
  const [filter, setFilter] = useState('');
  const [page, setPage] = useState(0);
  const [more, setMore] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [selected, setSelected] = useState(null);
  const [nextStatus, setNextStatus] = useState('');
  const dialog = useRef(null);
  const loadVersion = useRef(0);

  useEffect(() => {
    document.title = 'س | إدارة الطلبات';
    const controller = new AbortController();
    api('session', undefined, controller.signal).then(data => setSession(data.user)).catch(failure => {
      if (controller.signal.aborted) return;
      setSession(null);
      if (failure.status !== 401) setError(failure.message);
    });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!session) return;
    const controller = new AbortController();
    const version = ++loadVersion.current;
    setLoading(true); setError(''); setOrders([]);
    api('orders&status=' + encodeURIComponent(filter) + '&page=' + page, undefined, controller.signal)
      .then(data => { if (loadVersion.current === version) { setOrders(data.orders); setMore(data.hasMore); } })
      .catch(failure => {
        if (controller.signal.aborted || loadVersion.current !== version) return;
        setError(failure.message);
        if ([401, 403].includes(failure.status)) { setSession(null); setSelected(null); }
      }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [session, filter, page, refresh]);

  useEffect(() => {
    if (selected && !dialog.current.open) dialog.current.showModal();
    if (!selected && dialog.current.open) dialog.current.close();
  }, [selected]);

  async function login(event) {
    event.preventDefault();
    const form = event.currentTarget;
    const values = new FormData(form);
    setBusy(true); setError('');
    try {
      const data = await api('login', { email: values.get('email'), password: values.get('password') });
      form.reset(); setSession(data.user); setNotice('');
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function logout() {
    setBusy(true); setError('');
    try { await api('logout', {}); setSession(null); setOrders([]); setSelected(null); }
    catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  }

  async function saveStatus(event) {
    event.preventDefault();
    setBusy(true); setError(''); setNotice('');
    try {
      await api('status', { id: selected.id, previousStatus: selected.status, status: nextStatus });
      setNotice('تم حفظ حالة الطلب: ' + labels[nextStatus]);
      setSelected(null); setRefresh(value => value + 1);
    } catch (failure) {
      setError(failure.message);
      if ([401, 403].includes(failure.status)) { setSession(null); setSelected(null); setOrders([]); }
      if (failure.status === 409) { setNotice('الطلب اتغيّر في مكان تاني. القائمة اتحدثت؛ افتح الطلب وراجع حالته قبل التعديل.'); setSelected(null); setRefresh(value => value + 1); }
    } finally { setBusy(false); }
  }

  function openOrder(order) { setError(''); setSelected(order); setNextStatus(order.status); }
  const pageTotal = orders.reduce((sum, order) => sum + Number(order.subtotal_cents), 0);

  return (
    <div className="admin-shell" dir="rtl">
      <aside className="admin-sidebar">
        <a href="/" className="admin-brand"><img src="/brand/s-mark.svg" alt="س" /><span>س<small>مساحة الإدارة</small></span></a>
        <div className="admin-side-label">الاستوديو بتاعك</div>
        <nav className="admin-sections" aria-label="أقسام الإدارة">
          <button type="button" className={section === 'orders' ? 'admin-nav-active' : ''} aria-current={section === 'orders' ? 'page' : undefined} onClick={() => setSection('orders')}>▤ <span>الطلبات</span><span>↖</span></button>
          <button type="button" className={section === 'products' ? 'admin-nav-active' : ''} aria-current={section === 'products' ? 'page' : undefined} onClick={() => setSection('products')}>◇ <span>المنتجات</span><span>↖</span></button>
          <button type="button" className={section === 'custom' ? 'admin-nav-active' : ''} aria-current={section === 'custom' ? 'page' : undefined} onClick={() => setSection('custom')}>✦ <span>طلبات مخصوص</span><span>↖</span></button>
        </nav>
        <a href="/" className="admin-store-link">افتح المتجر ↗</a>
        <p className="admin-side-note">من أول فكرة،<br />لحد باب العميل.</p>
        <span className="admin-side-bottom">س / مساحة الإدارة</span>
      </aside>

      <main className="admin-main">
        <header className="admin-top"><span>س / إدارة المتجر</span>{session && <div><span className="admin-email" dir="ltr">{session.email}</span><button disabled={busy} onClick={logout}>خروج ↗</button></div>}</header>

        {session === undefined ? <p className="admin-loading" role="status">بنراجع جلسة الدخول…</p> : !session ? (
          <section className="admin-login">
            <span className="admin-eyebrow">أهلًا بيك في الكواليس</span>
            <h1>كل طلب،<br /><em>بداية حكاية.</em></h1>
            <p>سجّل دخولك عشان تتابع طلبات س.</p>
            <form onSubmit={login}>
              <label>الإيميل<input name="email" type="email" dir="ltr" autoComplete="username" maxLength="254" required placeholder="you@example.com" /></label>
              <label>كلمة المرور<input name="password" type="password" dir="ltr" autoComplete="current-password" maxLength="256" required /></label>
              {error && <p className="admin-error" role="alert">{error}</p>}
              <button className="admin-primary" disabled={busy}>{busy ? 'بنسجّل الدخول…' : 'ادخل الاستوديو ↖'}</button>
            </form>
          </section>
        ) : section === 'products' ? <Products onSessionExpired={() => { setSession(null); setOrders([]); }} /> : section === 'custom' ? <CustomRequests onSessionExpired={() => { setSession(null); setOrders([]); }} /> : (
          <section className="admin-content">
            <div className="admin-heading"><div><span className="admin-eyebrow">من المتجر للاستوديو</span><h1>طلبات س<span>.</span></h1><p>كل التفاصيل في مكان واحد، من أول طلب لحد التسليم.</p></div><button className="admin-refresh" disabled={loading || busy} onClick={() => setRefresh(value => value + 1)}>تحديث الطلبات ↻</button></div>
            <div className="admin-stats"><div><span>الطلبات المعروضة</span><strong>{loading ? '—' : orders.length.toLocaleString('ar-EG')}</strong></div><div><span>قيمة المنتجات في الصفحة</span><strong>{loading ? '—' : money(pageTotal)}</strong><small>بدون الشحن · يشمل الملغي لو ظاهر</small></div><div className="admin-stat-accent"><span>المرحلة الحالية</span><strong>{filter ? labels[filter] : 'كل الطلبات'}</strong><small>الصفحة {(page + 1).toLocaleString('ar-EG')}</small></div></div>
            <div className="admin-toolbar"><label htmlFor="order-filter">عرض الطلبات<select id="order-filter" value={filter} disabled={busy} onChange={event => { setFilter(event.target.value); setPage(0); setNotice(''); }}><option value="">كل الحالات</option>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><span>الأحدث أولًا · التوقيت بتوقيت القاهرة</span></div>
            {notice && <p className="admin-notice" role="status">✓ {notice}</p>}
            {error && !selected && <p className="admin-error" role="alert">{error}</p>}
            {loading ? <p className="admin-empty" role="status">بنحمّل الطلبات…</p> : orders.length === 0 ? <div className="admin-empty"><span>↗</span><h2>{error ? 'تعذّر تحميل الطلبات' : 'مفيش طلبات هنا لسه'}</h2><p>{error ? 'جرّب تحديث القائمة بعد مراجعة الاتصال.' : 'الطلبات الجديدة هتظهر هنا بعد حفظها في المتجر.'}</p></div> : <div className="admin-table-wrap"><table><caption className="admin-sr-only">قائمة طلبات المتجر</caption><thead><tr><th>الطلب / العميل</th><th>المجسم</th><th>قيمة المنتجات</th><th>الحالة</th><th>التفاصيل</th></tr></thead><tbody>{orders.map(order => <tr key={order.id}><td><strong>{order.customer_name}</strong><span dir="ltr" className="admin-order-id">{order.id.slice(-8).toUpperCase()}</span><small>{date(order.created_at)}</small></td><td><strong>{order.product_name}</strong><small>{order.quantity} قطعة</small></td><td>{money(order.subtotal_cents)}</td><td><span className={'admin-badge status-' + order.status}>{labels[order.status] || order.status}</span></td><td><button className="admin-view" onClick={() => openOrder(order)}>عرض الطلب ↖</button></td></tr>)}</tbody></table></div>}
            <nav className="admin-pagination" aria-label="صفحات الطلبات"><button disabled={page === 0 || loading || busy} onClick={() => setPage(value => value - 1)}>الصفحة السابقة</button><span>صفحة {page + 1}</span><button disabled={!more || loading || busy || Boolean(error)} onClick={() => setPage(value => value + 1)}>الصفحة التالية</button></nav>
          </section>
        )}
      </main>

      <dialog ref={dialog} className="admin-dialog" aria-labelledby="admin-order-title" onClose={() => { if (!busy) setSelected(null); }} onCancel={event => { if (busy) event.preventDefault(); }}>
        {selected && <><div className="admin-dialog-top"><span>تفاصيل الطلب</span><button aria-label="إغلاق تفاصيل الطلب" disabled={busy} onClick={() => setSelected(null)}>×</button></div><h2 id="admin-order-title">{selected.product_name}</h2><p className="admin-full-id" dir="ltr">{selected.id}</p><span className={'admin-badge status-' + selected.status}>{labels[selected.status] || selected.status}</span><dl className="admin-details"><div><dt>العميل</dt><dd>{selected.customer_name}</dd></div><div><dt>الموبايل</dt><dd><a dir="ltr" href={'tel:+' + (selected.phone.startsWith('0') ? '2' + selected.phone : selected.phone)}>{selected.phone}</a></dd></div><div><dt>العنوان</dt><dd>{selected.address}</dd></div><div><dt>وقت الطلب</dt><dd>{date(selected.created_at)}</dd></div><div><dt>الكمية / قيمة المنتجات</dt><dd>{selected.quantity} قطعة / {money(selected.subtotal_cents)}</dd></div><div><dt>ملاحظات</dt><dd>{selected.notes || 'مفيش ملاحظات'}</dd></div></dl><OrderItems order={selected} /><form onSubmit={saveStatus}><label>غيّر حالة الطلب<select value={nextStatus} onChange={event => setNextStatus(event.target.value)} disabled={busy}>{Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><p className="admin-status-hint">الحالة للتنظيم الداخلي؛ تغييرها لا يبعت رسالة للعميل.</p>{error && <p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy || nextStatus === selected.status}>{busy ? 'بنحفظ…' : 'حفظ الحالة ↖'}</button></form></>}
      </dialog>
    </div>
  );
}

