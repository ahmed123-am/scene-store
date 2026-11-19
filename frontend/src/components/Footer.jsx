import React from 'react';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-topline">
        <span>من تصميمنا. ومن صنعنا.</span>
        <a href="#top">ارجع لأول المشهد <span aria-hidden="true">↑</span></a>
      </div>
      <a href="#top" className="brand-name" dir="ltr" aria-label="SCÈNE الرئيسية">SCÈNE</a>
      <span>مجسمات ثلاثية الأبعاد تضيف طابعك للمكان.</span>
    </footer>
  );
}
