import React, { useState } from 'react';

const formatPrice = new Intl.NumberFormat('ar-EG', {
  style: 'currency',
  currency: 'EGP',
});

export default function ProductShowcase({ products }) {
  const [activeId, setActiveId] = useState(null);

  const activeProduct = products.find(
    (product) => product.id === activeId,
  );

  function resetAfterPointerLeave(event) {
    if (!event.currentTarget.contains(document.activeElement)) {
      setActiveId(null);
    }
  }

  function resetAfterBlur(event) {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setActiveId(null);
    }
  }

  return (
    <div
      className="product-showcase"
      onPointerLeave={resetAfterPointerLeave}
      onBlur={resetAfterBlur}
    >
      <div className="showcase-title" aria-hidden="true">
        <span key={activeProduct?.id ?? 'default'}>
          {activeProduct?.name ?? 'اختار مجسمك.'}
        </span>
      </div>

      <ul className="showcase-grid">
        {products.map((product) => (
          <li key={product.id}>
            <button
              type="button"
              className="showcase-card"
              data-active={activeId === product.id}
              aria-pressed={activeId === product.id}
              onPointerEnter={(event) => {
                if (event.pointerType !== 'touch') {
                  setActiveId(product.id);
                }
              }}
              onFocus={() => setActiveId(product.id)}
              onClick={() => setActiveId(product.id)}
            >
              <span className="showcase-image">
                {product.image ? (
                  <img
                    src={product.image}
                    alt=""
                    loading="lazy"
                  />
                ) : (
                  <span className="showcase-placeholder">
                    الصورة قريبًا
                  </span>
                )}
              </span>

              <span className="showcase-info">
                <span className="showcase-name">
                  {product.name}
                </span>

                <span className="showcase-price">
                  {formatPrice.format(product.price)}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}