import React, { useEffect, useRef, useState } from 'react';
import { contactDetails } from '../data/contact.js';
import CustomRequestDialog from './CustomRequestDialog.jsx';
import './contact-scene.css';

export default function Contact({ product }) {
  const [customOpen,setCustomOpen]=useState(false);
  const scene=useRef(null);
  const message=product?'مرحبًا SCÈNE، حابب أسأل عن مجسم '+product.name+'.':'مرحبًا SCÈNE، حابب أعرف أكتر عن المجسمات وطريقة الطلب.';
  const number=contactDetails.whatsapp.replace(/[^0-9]/g,'');
  useEffect(()=>{
    const preference=matchMedia('(prefers-reduced-motion: reduce)');
    if(preference.matches)return;
    let frame;
    const update=()=>{
      frame=null;
      const box=scene.current?.getBoundingClientRect();
      if(!box||box.bottom<0||box.top>innerHeight)return;
      const progress=Math.max(-1,Math.min(1,(box.top-innerHeight*.3)/innerHeight));
      scene.current.style.setProperty('--contact-drift',progress*35+'px');
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    addEventListener('scroll',schedule,{passive:true});addEventListener('resize',schedule);schedule();
    return()=>{removeEventListener('scroll',schedule);removeEventListener('resize',schedule);if(frame)cancelAnimationFrame(frame);};
  },[]);
  return <>
    <section ref={scene} id="contact" className="contact-scene" aria-labelledby="contact-title">
      <div className="contact-scene-meta"><span><i aria-hidden="true"/>مساحة للأفكار اللي لسه بتتشكّل</span><span dir="ltr">SCÈNE / OPEN TO IDEAS</span></div>
      <div className="contact-scene-stage">
        <div className="contact-scene-copy"><span className="contact-kicker">القطعة الجاية ممكن تكون فكرتك.</span><h2 id="contact-title">اللي في بالك،<br/><span>نخلّيه <em>قدّامك.</em></span></h2><p>صورة شفتها؟ شكل من خيالك؟ أو سؤال عن قطعة عجبتك؟ دي أول خطوة لحاجة تشبهك.</p>
          <button className="contact-custom-cta" onClick={()=>setCustomOpen(true)}><span>اطلب مجسم مخصوص</span><span aria-hidden="true">↖</span></button><small className="contact-custom-note">ارفع صورة · احكيلنا التفاصيل · نتفق على السعر</small>
          {product&&<div className="contact-inquiry-tag">بتسأل عن <strong>{product.name}</strong><a href="#products">اختار مجسم تاني ↖</a></div>}
        </div>
        <div className="contact-playground" aria-hidden="true">
          <div className="contact-orbit contact-orbit-one"/><div className="contact-orbit contact-orbit-two"/>
          <span className="contact-spark contact-spark-one">✳</span><span className="contact-spark contact-spark-two">＋</span>
          <div className="contact-floating-figure"><span className="contact-speech">عندك فكرة غريبة؟<br/><b>إحنا بنحب كده.</b></span><img src="/products/robot.webp" alt="" loading="lazy" width="640" height="640"/></div>
          <div className="contact-maker-stamp"><span>MADE TO BE</span><strong>YOU.</strong><span>SCÈNE / CUSTOM</span></div><span className="contact-coordinate" dir="ltr">IDEA → OBJECT</span>
        </div>
      </div>
      <div className="contact-methods">
        {number&&<a className="contact-ticket ticket-whatsapp" href={'https://wa.me/'+number+'?text='+encodeURIComponent(message)} target="_blank" rel="noreferrer"><span className="ticket-top"><span>01 / خلّينا ندردش</span><span className="ticket-arrow" aria-hidden="true">↗</span></span><span className="ticket-name">واتساب<span aria-hidden="true">↗</span></span><span className="ticket-bottom"><span>اسألنا عن القطعة اللي في بالك</span><span dir="ltr">{contactDetails.whatsapp}</span></span></a>}
        {contactDetails.email&&<a className="contact-ticket ticket-email" href={'mailto:'+contactDetails.email+'?subject='+encodeURIComponent('استفسار SCÈNE')+'&body='+encodeURIComponent(message)}><span className="ticket-top"><span>02 / كلام أكتر وتفاصيل أكتر</span><span className="ticket-arrow" aria-hidden="true">↗</span></span><span className="ticket-name">ابعتلنا ميل<span aria-hidden="true">↗</span></span><span className="ticket-bottom"><span>مساحة لكل أفكارك</span><span dir="ltr">{contactDetails.email}</span></span></a>}
        {contactDetails.instagram&&<a className="contact-instagram" href={contactDetails.instagram} target="_blank" rel="noreferrer">شوف سين على إنستجرام ↗</a>}
      </div>
    </section>
    <CustomRequestDialog open={customOpen} onClose={()=>setCustomOpen(false)}/>
  </>;
}
