import React from 'react';
const money = value => new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(value);
export default function OrderItems({ order }) {
  const items = order.items?.length ? order.items : [{ productId: order.product_id, productName: order.product_name, quantity: order.quantity, unitPrice: Number(order.unit_price_cents) / 100, subtotal: Number(order.subtotal_cents) / 100 }];
  return <section className="admin-order-items" aria-label="منتجات الطلب"><h3>كل المنتجات في الطلب</h3>{items.map(item => <div key={item.productId}><span><strong>{item.productName}</strong><small>{item.quantity} قطعة × {money(item.unitPrice)}</small></span><b>{money(item.subtotal)}</b></div>)}</section>;
}
