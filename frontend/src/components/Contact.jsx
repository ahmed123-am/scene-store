import React from 'react';
import { contactDetails } from '../data/contact.js';

export default function Contact({ product }) {
  const message = product
    ? 'مرحبًا SCÈNE، حابب أسأل عن مجسم ' + product.name + '.'
    : 'مرحبًا SCÈNE، حابب أعرف أكتر عن المجسمات وطريقة الطلب.';
  const number = contactDetails.whatsapp.replace(/[^0-9]/g, '');
  const hasChannels = Boolean(number || contactDetails.email || contactDetails.instagram);

  return (
    <section className="contact-section" id="contact" aria-labelledby="contact-title">
      <div className="contact-intro">
        <p className="section-label">خلّينا نتكلم</p>
        <h2 id="contact-title">محتاج مساعدة؟<br /><span>كلّمنا.</span></h2>
        <p>لو عندك سؤال قبل الطلب أو بعده، اختار وسيلة التواصل المناسبة ليك.</p>
        {product && (
          <div className="inquiry-product">
            <span>بتسأل عن <strong>{product.name}</strong></span>
            <a href="#products">اختار مجسم تاني ↖</a>
          </div>
        )}
      </div>
      <div className="contact-channels">
        {number && (
          <a className="contact-channel" href={'https://wa.me/' + number + '?text=' + encodeURIComponent(message)} target="_blank" rel="noreferrer">
            <span>واتساب</span><span aria-hidden="true">↗</span>
          </a>
        )}
        {contactDetails.email && (
          <a className="contact-channel" href={'mailto:' + contactDetails.email + '?subject=' + encodeURIComponent('استفسار SCÈNE') + '&body=' + encodeURIComponent(message)}>
            <span>البريد الإلكتروني</span><span aria-hidden="true">↗</span>
          </a>
        )}
        {contactDetails.instagram && (
          <a className="contact-channel" href={contactDetails.instagram} target="_blank" rel="noreferrer">
            <span>إنستجرام</span><span aria-hidden="true">↗</span>
          </a>
        )}
        {!hasChannels && <p className="contact-pending">وسائل التواصل هتتوفر قريبًا.</p>}
      </div>
    </section>
  );
}


