import React from 'react';
export default function Footer() {
  return <footer className="scene-finale">
    <div className="finale-top"><p>مش مجرد مجسم.<br/><strong>حتّة منك في المكان.</strong></p><a className="finale-back" href="#top"><span>نرجع لأول المشهد؟</span><b aria-hidden="true">↑</b></a></div>
    <div className="finale-brand-stage"><span className="finale-orbit" aria-hidden="true"/><a href="#top" className="finale-word" dir="ltr" aria-label="SCÈNE الرئيسية">SCÈNE<span aria-hidden="true">✳</span></a><div className="finale-sticker" aria-hidden="true"><span>من تصميمنا.</span><img src="/scene.jpeg" alt="" width="64" height="64"/><span>ومن صنعنا.</span></div></div>
    <div className="finale-bottom"><span>كل قطعة… بداية حكاية.</span><span dir="ltr">© {new Date().getFullYear()} SCÈNE</span><a href="#products">اختار قطعتك ↖</a></div>
  </footer>;
}
