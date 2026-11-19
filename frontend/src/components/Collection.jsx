import React, { useEffect, useState } from 'react';
import { getProducts } from '../api/products.js';
import ProductShowcase from './ProductShowcase.jsx';

export default function Collection() {
  const [products, setProducts] = useState(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    const controller = new AbortController();

    async function loadProducts() {
      try {
        const items = await getProducts(controller.signal);
        setProducts(items);
      } catch {
        if (!controller.signal.aborted) {
          setError(true);
        }
      }
    }

    loadProducts();

    return () => controller.abort();
  }, []);

  return (
    <section
      className="collection"
      id="collection"
      aria-labelledby="collection-title"
    >
      <h2 id="collection-title">المجموعة</h2>

      {error && (
        <p role="alert">
          المجموعة مش متاحة دلوقتي. جرّب تحدّث الصفحة.
        </p>
      )}

      {!error && products === null && (
        <p role="status">بنحمّل المجموعة…</p>
      )}

      {products?.length === 0 && (
        <p className="empty">
          أول مجموعة من مجسمات SCÈNE هتتعرض هنا قريب.
        </p>
      )}

      {products?.length > 0 && (
        <ProductShowcase products={products} />
      )}
    </section>
  );
}