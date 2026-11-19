import React from 'react';

export default function Header() {
  return (
    <header className="site-header">
      <a className="brand" href="#top" aria-label="SCÈNE الرئيسية">
        <img src="/scene.jpeg" alt="SCÈNE" width="64" height="64" />
      </a>
      <nav aria-label="القائمة الرئيسية">
        <a href="#products">المجسمات</a>
        <a href="#about">عن سين</a>
        <a className="nav-contact" href="#contact">تواصل معانا <span aria-hidden="true">↗</span></a>
      </nav>
    </header>
  );
}
