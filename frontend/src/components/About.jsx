import React from 'react';

export default function About() {
  return (
    <section className="about-section brand-story" id="about" aria-labelledby="about-title">
      <div className="brand-story-copy">
        <p className="section-label">إحنا سين</p>
        <h2 id="about-title">بنصمّمها.<br /><span>وبنصنعها.</span></h2>
        <p className="brand-story-description">
          من أول التصميم الرقمي لحد ما يبقى مجسم بين إيديك،
          دي طريقتنا في SCÈNE لصناعة قطع تضيف طابعك للمكان.
        </p>
        <a href="#products" className="text-link">اختار قطعتك <span aria-hidden="true">↖</span></a>
      </div>
      <div className="brand-signature">
        <img src="/scene.jpeg" alt="شعار سين الأصلي" width="1024" height="1024" />
        <p>تصميم وتصنيع ثلاثي الأبعاد</p>
      </div>
    </section>
  );
}
