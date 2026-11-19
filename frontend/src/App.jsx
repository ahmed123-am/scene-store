import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';

import Contact from './components/Contact.jsx';
import Footer from './components/Footer.jsx';
import OrderDialog from './components/OrderDialog.jsx';

export default function App() {
  const pageRef = useRef(null);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [orderProduct, setOrderProduct] = useState(null);

  useEffect(() => {
    const elements = pageRef.current.querySelectorAll('.reveal');

    const preference = window.matchMedia(
      '(prefers-reduced-motion: reduce)',
    );

    if (
      preference.matches ||
      !('IntersectionObserver' in window)
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('reveal-pending');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 },
    );

    elements.forEach((element) => {
      element.classList.add('reveal-pending');
      observer.observe(element);
    });

    function showAll() {
      if (preference.matches) {
        elements.forEach((element) => {
          element.classList.remove('reveal-pending');
        });

        observer.disconnect();
      }
    }

    preference.addEventListener('change', showAll);

    return () => {
      observer.disconnect();
      preference.removeEventListener('change', showAll);

      elements.forEach((element) => {
        element.classList.remove('reveal-pending');
      });
    };
  }, []);

  return (
    <div ref={pageRef}>
      <Header />

      <main>
        <Hero onInquiry={setInquiryProduct} onOrder={setOrderProduct} />

        <div className="reveal">
          <About />
        </div>
        
        <div className="reveal"><Contact product={inquiryProduct} /></div>
      </main>
      <OrderDialog product={orderProduct} onClose={() => setOrderProduct(null)} />

      <div className="reveal">
        <Footer />
      </div>
    </div>
  );
}



