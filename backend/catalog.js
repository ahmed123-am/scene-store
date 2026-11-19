import { readFileSync } from 'node:fs';
import { usesSupabase, supabaseRequest } from './supabase.js';

export async function readProducts() {
  if (usesSupabase()) {
    const products = await supabaseRequest(
      'products?select=id,name,price_cents,image,hero_image&active=eq.true&order=position.asc,id.asc',
    );
    return products.map((product) => ({
      id: product.id,
      name: product.name,
      price: Number(product.price_cents) / 100,
      image: product.image,
      heroImage: product.hero_image || product.image,
    }));
  }

  const products = JSON.parse(
    readFileSync(new URL('./products.json', import.meta.url), 'utf8'),
  );
  if (!Array.isArray(products)) throw new Error('Invalid catalog');
  return products;
}
