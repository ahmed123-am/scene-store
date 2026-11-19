import React from 'react';

export default function BrandDetails() {
  return (
    <section className="brand-details" aria-labelledby="details-title">
      <div className="details-heading">
        <h2 id="details-title">قرب أكتر.</h2>
        <p>الشكل يلفت نظرك. والتفاصيل تكمّل الحكاية.</p>
      </div>

      <div className="details-grid">
        <figure className="detail-panel detail-texture">
          <div className="detail-image">
            <img src="/products/vase.png" alt="لقطة قريبة لطبقات الطباعة في فازة تويست التجريبية" loading="lazy" width="1122" height="1402" />
          </div>
          <figcaption>
            <h3>ملمس الطباعة.</h3>
            <p>خطوط صغيرة بتظهر طريقة تكوّن المجسم، طبقة فوق طبقة.</p>
          </figcaption>
        </figure>

        <figure className="detail-panel detail-shape">
          <div className="detail-image">
            <img src="/products/owl.webp" alt="تفاصيل ريش البومة في تصور المجموعة التجريبية" loading="lazy" />
          </div>
          <figcaption>
            <h3>التفاصيل الصغيرة.</h3>
            <p>من انحناءة بسيطة لنقشة واضحة، كل شكل ليه شخصيته.</p>
          </figcaption>
        </figure>
      </div>
      <p className="details-caption">تفاصيل من التصورات التجريبية للمجموعة.</p>
    </section>
  );
}
