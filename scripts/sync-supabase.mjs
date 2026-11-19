import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { supabaseRequest, usesSupabase } from '../backend/supabase.js';

if (!usesSupabase()) throw new Error('Set SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local.');

const products = JSON.parse(readFileSync(
  new URL('../backend/products.json', import.meta.url), 'utf8',
)).map((product, position) => ({
  id: product.id,
  name: product.name,
  price_cents: Math.round(product.price * 100),
  image: product.image,
  hero_image: product.heroImage || product.image,
  position,
  active: true,
}));

await supabaseRequest('products?on_conflict=id', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    Prefer: 'resolution=ignore-duplicates,return=minimal',
  },
  body: JSON.stringify(products),
});

const localDatabase = fileURLToPath(new URL('../backend/data/orders.sqlite', import.meta.url));
let count = 0;
if (existsSync(localDatabase)) {
  const { DatabaseSync } = await import('node:sqlite');
  const database = new DatabaseSync(localDatabase, { readOnly: true });
  const orders = database.prepare('SELECT * FROM orders ORDER BY created_at').all();
  database.close();
  for (let offset = 0; offset < orders.length; offset += 100) {
    const batch = orders.slice(offset, offset + 100);
    await supabaseRequest('orders?on_conflict=idempotency_key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Prefer: 'resolution=ignore-duplicates,return=minimal',
      },
      body: JSON.stringify(batch),
    });
    count += batch.length;
  }
}
console.log('Synced catalog and local orders.', { products: products.length, orders: count });
