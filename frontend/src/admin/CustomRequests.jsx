import React, { useEffect, useRef, useState } from 'react';
import { adminApi } from './api.js';
const labels={pending:'جديد',reviewing:'قيد المراجعة',contacted:'تم التواصل',cancelled:'ملغي'};
const date=value=>new Intl.DateTimeFormat('ar-EG',{dateStyle:'medium',timeStyle:'short',timeZone:'Africa/Cairo'}).format(new Date(value));

export default function CustomRequests({onSessionExpired}) {
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [page,setPage]=useState(0);
  const [more,setMore]=useState(false);
  const [status,setStatus]=useState('');
  const [refresh,setRefresh]=useState(0);
  const [detail,setDetail]=useState(null);
  const [next,setNext]=useState('');
  const [imageFailed,setImageFailed]=useState(false);
  const dialog=useRef(null);
  const expire=useRef(onSessionExpired);expire.current=onSessionExpired;
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');setRows([]);
    adminApi('custom-orders&page='+page+'&status='+encodeURIComponent(status),undefined,controller.signal).then(data=>{setRows(data.requests);setMore(data.hasMore);}).catch(failure=>{
      if(controller.signal.aborted)return;
      setError(failure.message);if([401,403].includes(failure.status))expire.current();
    }).finally(()=>{if(!controller.signal.aborted)setLoading(false);});
    return()=>controller.abort();
  },[page,status,refresh]);
  useEffect(()=>{
    if(detail&&!dialog.current.open)dialog.current.showModal();
    if(!detail&&dialog.current.open)dialog.current.close();
  },[detail]);
  async function openDetail(id) {
    setBusy(true);setError('');
    try {const data=await adminApi('custom-detail&id='+encodeURIComponent(id));setDetail(data);setNext(data.status);setImageFailed(false);}
    catch(failure){setError(failure.message);if([401,403].includes(failure.status))expire.current();}
    finally{setBusy(false);}
  }
  async function save(event) {
    event.preventDefault();setBusy(true);setError('');setNotice('');
    try{await adminApi('custom-status',{id:detail.id,status:next,previousStatus:detail.status});setDetail(null);setNotice('تم حفظ حالة الطلب المخصص.');setRefresh(value=>value+1);}
    catch(failure){setError(failure.message);if([401,403].includes(failure.status))expire.current();if(failure.status===409){setDetail(null);setNotice('الطلب اتغيّر. افتحه من جديد بعد تحديث القائمة.');setRefresh(value=>value+1);}}
    finally{setBusy(false);}
  }
  return <section className="admin-content">
    <div className="admin-heading"><div><span className="admin-eyebrow">من خيال العميل… للاستوديو</span><h1>طلبات مخصوص<span>.</span></h1><p>راجع الصور والتفاصيل، واتفق مع العميل على السعر وإمكانية التنفيذ.</p></div><button className="admin-refresh" disabled={loading||busy} onClick={()=>setRefresh(value=>value+1)}>تحديث الطلبات ↻</button></div>
    <div className="admin-toolbar"><label>حالة الطلب المخصص<select value={status} disabled={busy} onChange={event=>{setStatus(event.target.value);setPage(0);}}><option value="">كل الحالات</option>{Object.entries(labels).map(([value,label])=><option value={value} key={value}>{label}</option>)}</select></label><span>السعر يتحدد بعد المراجعة · الصور خاصة بفريق س</span></div>
    {notice&&<p className="admin-notice" role="status">{notice}</p>}{error&&!detail&&<p className="admin-error" role="alert">{error}</p>}
    {loading?<p className="admin-empty" role="status">بنحمّل الأفكار الجديدة…</p>:!rows.length?<div className="admin-empty"><span>✦</span><h2>{error?'تعذّر تحميل الطلبات المخصصة':'مفيش طلبات مخصصة هنا لسه'}</h2><p>الطلب بيظهر هنا بعد حفظ بياناته وصورته بنجاح.</p></div>:<div className="admin-custom-list">{rows.map(row=><article className="admin-custom-card" key={row.id}><div><span className={'admin-badge status-'+(row.status==='contacted'?'completed':row.status==='reviewing'?'confirmed':row.status)}>{labels[row.status]}</span><h2>{row.customer_name}</h2><p>{row.description}</p><small>{row.quantity} قطعة · {date(row.created_at)}</small></div><button disabled={busy} onClick={()=>openDetail(row.id)}>عرض الصورة والتفاصيل ↖</button></article>)}</div>}
    <nav className="admin-pagination" aria-label="صفحات الطلبات المخصصة"><button disabled={!page||loading||busy} onClick={()=>setPage(value=>value-1)}>الصفحة السابقة</button><span>صفحة {page+1}</span><button disabled={!more||loading||busy||Boolean(error)} onClick={()=>setPage(value=>value+1)}>الصفحة التالية</button></nav>
    <dialog ref={dialog} className="admin-dialog" aria-labelledby="admin-custom-title" onClose={()=>{if(!busy)setDetail(null);}} onCancel={event=>{if(busy)event.preventDefault();}}>{detail&&<>
      <div className="admin-dialog-top"><span>طلب مخصص</span><button aria-label="إغلاق تفاصيل الطلب المخصص" disabled={busy} onClick={()=>setDetail(null)}>×</button></div><h2 id="admin-custom-title">فكرة {detail.customer_name}</h2><p className="admin-full-id" dir="ltr">{detail.id}</p>
      <div className="admin-reference-image">{!imageFailed?<img src={detail.imageUrl} alt="الصورة المرجعية للشكل المطلوب" onError={()=>setImageFailed(true)} referrerPolicy="no-referrer"/>:<p>تعذّر عرض الصورة أو انتهت صلاحية الرابط.</p>}</div><div className="admin-reference-tools"><button disabled={busy} onClick={()=>openDetail(detail.id)}>تحديث الصورة ↻</button><a href={detail.imageUrl} target="_blank" rel="noreferrer">افتح الصورة ↗</a></div>
      <dl className="admin-details"><div><dt>رقم الموبايل</dt><dd><a href={'tel:'+detail.phone} dir="ltr">{detail.phone}</a></dd></div><div><dt>الكمية</dt><dd>{detail.quantity}</dd></div><div><dt>المقاسات</dt><dd>{detail.dimensions||'لم تُحدد'}</dd></div><div><dt>التفاصيل</dt><dd>{detail.description}</dd></div><div><dt>وقت الطلب</dt><dd>{date(detail.created_at)}</dd></div><div><dt>السعر</dt><dd>يتحدد بعد مراجعة الصورة والاتفاق مع العميل.</dd></div></dl>
      <form onSubmit={save}><label>تغيير حالة الطلب المخصص<select value={next} disabled={busy} onChange={event=>setNext(event.target.value)}>{Object.entries(labels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select></label><p className="admin-status-hint">تغيير الحالة للتنظيم الداخلي، ولا يرسل عرض سعر للعميل تلقائيًا.</p>{error&&<p className="admin-error" role="alert">{error}</p>}<button className="admin-primary" disabled={busy||next===detail.status}>{busy?'بنحفظ…':'حفظ حالة الطلب المخصص'}</button></form>
    </>}</dialog>
  </section>;
}
