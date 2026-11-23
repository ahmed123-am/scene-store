import React, { useEffect, useRef, useState } from 'react';
import Header from './components/Header.jsx';
import Hero from './components/Hero.jsx';
import About from './components/About.jsx';

import Contact from './components/Contact.jsx';
import PrintQuote from './components/PrintQuote.jsx';
import Footer from './components/Footer.jsx';
import OrderDialog from './components/OrderDialog.jsx';
import { useCart } from './hooks/useCart.js';
import './cart.css';

export default function App() {
  const pageRef = useRef(null);
  const [inquiryProduct, setInquiryProduct] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const cart = useCart();
  const cartCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

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
        <Hero onInquiry={setInquiryProduct} onOrder={cart.add} />

        <div className="reveal"><PrintQuote /></div>

        <div className="reveal">
          <About />
        </div>
        
        <div className="reveal"><Contact product={inquiryProduct} /></div>
      </main>
      <button className="cart-floating" type="button" onClick={() => setCartOpen(true)} aria-label={'افتح سلة المشتريات، ' + cartCount + ' قطعة'}><span>السلة</span><strong>{cartCount}</strong><span aria-hidden="true">↖</span></button>
      {!cartOpen && cart.notice && <p className="cart-toast" role="status">{cart.notice}</p>}
      <OrderDialog open={cartOpen} cart={cart} onClose={() => setCartOpen(false)} />

      <div className="reveal">
        <Footer />
      </div>
    </div>
  );
}




