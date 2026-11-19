import React, { useEffect, useRef, useState } from 'react';
import { getProducts } from '../api/products.js';
import WaveTitle from './WaveTitle.jsx';

const themes = [
  { background: '#d7caf1', ink: '#312242', accent: '#72509c' },
  { background: '#e4d9f3', ink: '#312242', accent: '#72509c' },
  { background: '#cfc0e8', ink: '#312242', accent: '#72509c' },
];

const priceFormatter = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
});

export default function Hero({ onInquiry, onOrder }) {
  const [products, setProducts] = useState([]);
  const [index, setIndex] = useState(0);
  const [error, setError] = useState(false);
  const [loading, setLoading] = useState(true);
  const swipeStart = useRef(null);
  const dockRef = useRef(null);
  const [cursorVisible, setCursorVisible] = useState(false);
  const product = products[index];
  const theme = themes[index % themes.length];

  useEffect(() => {
    const controller = new AbortController();
    getProducts(controller.signal)
      .then((items) => {
        setProducts(items);
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setError(true);
          setLoading(false);
        }
      });
    return () => controller.abort();
  }, []);

  function selectProduct(nextIndex) {
    setIndex(nextIndex);
    const item = dockRef.current?.querySelectorAll('.dock-item')[nextIndex];
    item?.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth',
      block: 'nearest',
      inline: 'center',
    });
  }

  function move(direction) {
    if (products.length) {
      selectProduct((index + direction + products.length) % products.length);
    }
  }

  function handleKey(event) {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      move(1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      move(-1);
    }
  }

  function finishSwipe(event) {
    if (swipeStart.current !== null) {
      const distance = event.clientX - swipeStart.current;
      if (Math.abs(distance) > 55) move(distance < 0 ? 1 : -1);
    }
    swipeStart.current = null;
  }

  return (
    <section
      className="theater"
      id="products"
      aria-label="استكشف مجسمات سين"
      style={{ '--stage-bg': theme.background, '--stage-ink': theme.ink, '--stage-accent': theme.accent }}
      onKeyDown={handleKey}
    >
      <div className="theater-topline">
        <p><span dir="ltr">SCÈNE</span> / من التصميم لمساحتك.</p>
        <a href="#about">عن سين <span aria-hidden="true">↙</span></a>
      </div>

      {product ? (
        <>
          <h1 className="theater-word" key={'title-' + product.id} aria-label={product.name}><WaveTitle text={product.name} /></h1>
          <div className="theater-orbit" aria-hidden="true" />
          <div
            className="theater-figure"
            onPointerDown={(event) => {
              swipeStart.current = event.clientX;
              event.currentTarget.setPointerCapture(event.pointerId);
            }}
            onPointerUp={finishSwipe}
            onPointerCancel={() => { swipeStart.current = null; }}
          >
            <img
              key={product.id}
              src={product.heroImage || product.image}
              alt={product.name}
              draggable="false"
              className="theater-object"
            />
          </div>

          <div className="theater-shadow" aria-hidden="true" />

          <div className="theater-details" aria-live="polite" aria-atomic="true">
            <p className="theater-product-name">{product.name}</p>
            <p className="theater-price">{priceFormatter.format(product.price)}</p>
            <div className="product-actions">
              <button type="button" className="theater-link" onClick={() => onOrder(product)}>ضيف للسلة <span aria-hidden="true">＋</span></button>
              <a href="#contact" className="product-question" onClick={() => onInquiry(product)}>عندك سؤال؟</a>
            </div>
          </div>

          {products.length > 1 && (
            <div className="theater-controls" aria-label="التنقّل بين المجسمات">
              <button className="stage-arrow" onClick={() => move(-1)} aria-label="المجسم السابق" type="button">→</button>
              <div
                className="theater-dock"
                aria-label="اختيار مجسم"
                ref={dockRef}
                data-cursor={cursorVisible}
                onPointerMove={(event) => {
                  if (event.pointerType !== 'mouse') return;
                  const rect = event.currentTarget.getBoundingClientRect();
                  dockRef.current.style.setProperty('--cursor-x', event.clientX - rect.left + 'px');
                  dockRef.current.style.setProperty('--cursor-y', event.clientY - rect.top + 'px');
                  setCursorVisible(true);
                }}
                onPointerLeave={() => setCursorVisible(false)}
              >
                <span className="dock-cursor" aria-hidden="true">↗</span>
                <div className="theater-rail">
                {products.map((item, itemIndex) => (
                  <button
                    key={item.id}
                    className="dock-item"
                    type="button"
                    aria-label={item.name}
                    aria-pressed={index === itemIndex}
                    onPointerEnter={(event) => {
                      if (event.pointerType === 'mouse') setIndex(itemIndex);
                    }}
                    onFocus={() => selectProduct(itemIndex)}
                    onClick={() => selectProduct(itemIndex)}
                  >
                    <img src={item.heroImage || item.image} alt="" draggable="false" decoding="async" />
                  </button>
                ))}
                </div>
              </div>
              <button className="stage-arrow" onClick={() => move(1)} aria-label="المجسم التالي" type="button">←</button>
            </div>
          )}
        </>
      ) : (
        <div className="theater-loading" role="status">
          {loading ? 'بنجهّز المشهد…' : error ? 'شغّل الباك إند وحدّث الصفحة عشان نعرض المجسمات.' : 'المجسمات الجديدة هتظهر هنا قريب.'}
        </div>
      )}
      <a className="theater-scroll" href="#about" aria-label="اعرف أكتر عن سين">↓</a>
    </section>
  );
}






