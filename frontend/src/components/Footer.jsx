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
    <div className="ending-meta"><span>من أول فكرة… لآخر تفصيلة.</span><span >تخيّلها. نعملها.</span></div>
    <div className="ending-stage">
      <div className="ending-copy"><span className="ending-eyebrow">هنا الأفكار بتاخد شكل.</span><h2>بداية صغيرة.<br/><span>بُعد تاني خالص.</span></h2><p>قطعة من مجموعتنا، أو فكرة لسه محدّش عملها.<br/>«س» تصمّم، تطبع، وتخلّيها حقيقة.</p><div className="ending-links"><a className="ending-main-link" href="#products">لاقي قطعتك <span aria-hidden="true">↖</span></a><a className="ending-custom-link" href="#contact">أو خلّيها مخصوص ليك ↗</a></div></div>
      <div className="ending-art" onPointerMove={tilt} onPointerLeave={reset} aria-hidden="true">
        <div className="ending-sculpture" ref={sculpture}>
          <div className="ending-light"/>
          <div className="ending-dimension ending-dimension-height"><span>من فكرة</span></div><div className="ending-dimension ending-dimension-width"><span>لحاجة بين إيديك</span></div>
          <div className="ending-object ending-printer"><img src="/brand/s-printer.svg" alt="" width="640" height="600" loading="lazy"/></div>
          <div className="ending-object-shadow"/>
          <div className="ending-print-bed">{Array.from({length:6},(_,index)=><span key={index} style={{'--layer':index}}/>)}<b>✳</b></div>
          <span className="ending-art-label">س / طبقة ورا طبقة</span><span className="ending-plus ending-plus-one">＋</span><span className="ending-plus ending-plus-two">＋</span>
        </div>
      </div>
    </div>
    <div className="ending-bottom"><a href="#top" className="ending-small-brand" aria-label="س — ارجع لأول الصفحة"><span className="s-mark" aria-hidden="true"/><span>صُنع بخيال.<small>س © {new Date().getFullYear()}</small></span></a><span className="ending-credit" dir="ltr">By <strong>Ahmed Galal</strong></span><a href="#top" className="ending-top-link">نرجع لأول المشهد <span aria-hidden="true">↑</span></a></div>
  </footer>;
}
