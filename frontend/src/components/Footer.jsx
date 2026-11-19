import React, { useEffect, useRef } from 'react';
import './footer-exhibit.css';

export default function Footer() {
  const exhibit=useRef(null);
  const sculpture=useRef(null);
  useEffect(()=>{
    if(!('IntersectionObserver' in window)){exhibit.current.dataset.active='true';return;}
    const observer=new IntersectionObserver(([entry])=>{if(exhibit.current)exhibit.current.dataset.active=String(entry.isIntersecting);},{threshold:.08});
    observer.observe(exhibit.current);return()=>observer.disconnect();
  },[]);
  function tilt(event) {
    if(event.pointerType!=='mouse'||matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const box=event.currentTarget.getBoundingClientRect();
    sculpture.current.style.setProperty('--tilt-x',(event.clientX-box.left-box.width/2)/box.width*12+'deg');
    sculpture.current.style.setProperty('--tilt-y',-(event.clientY-box.top-box.height/2)/box.height*8+'deg');
  }
  function reset(){sculpture.current?.style.setProperty('--tilt-x','0deg');sculpture.current?.style.setProperty('--tilt-y','0deg');}
  return <footer className="ending-exhibit" ref={exhibit}>
    <div className="ending-meta"><span>من أول فكرة… لآخر تفصيلة.</span><span dir="ltr">DESIGNED. PRINTED. YOURS.</span></div>
    <div className="ending-stage">
      <div className="ending-copy"><span className="ending-eyebrow">آخر الصفحة. أول حكاية.</span><h2>خيالك ملوش حدود.<br/><span>ليه قطعتك يبقى ليها؟</span></h2><p>قطعة من مجموعتنا، أو فكرة لسه محدّش عملها.<br/>في الحالتين… المشهد يكمل بيك.</p><div className="ending-links"><a className="ending-main-link" href="#products">لاقي قطعتك <span aria-hidden="true">↖</span></a><a className="ending-custom-link" href="#contact">أو خلّيها مخصوص ليك ↗</a></div></div>
      <div className="ending-art" onPointerMove={tilt} onPointerLeave={reset} aria-hidden="true">
        <div className="ending-sculpture" ref={sculpture}>
          <div className="ending-light"/>
          <div className="ending-dimension ending-dimension-height"><span>YOUR IDEAS</span></div><div className="ending-dimension ending-dimension-width"><span>TAKE SHAPE</span></div>
          <div className="ending-object"><img src="/products/planter.webp" alt="" width="640" height="640" loading="lazy"/></div>
          <div className="ending-object-shadow"/>
          <div className="ending-print-bed">{Array.from({length:6},(_,index)=><span key={index} style={{'--layer':index}}/>)}<b>✳</b></div>
          <span className="ending-art-label">SCÈNE / A NEW DIMENSION</span><span className="ending-plus ending-plus-one">＋</span><span className="ending-plus ending-plus-two">＋</span>
        </div>
      </div>
    </div>
    <div className="ending-bottom"><a href="#top" className="ending-small-brand" aria-label="سين — ارجع لأول الصفحة"><img src="/scene.jpeg" alt="" width="38" height="38"/><span dir="ltr">SCÈNE <small>© {new Date().getFullYear()}</small></span></a><span className="ending-credit" dir="ltr">By <strong>Ahmed Galal</strong></span><a href="#top" className="ending-top-link">نرجع لأول المشهد <span aria-hidden="true">↑</span></a></div>
  </footer>;
}
