export async function getProducts(signal) {
  const response = await fetch('/api/products', { signal });

  if (!response.ok) {
    throw new Error('Could not load products');
  }

  return response.json();
}