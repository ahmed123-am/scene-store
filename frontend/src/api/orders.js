export async function submitOrder(payload, key, signal) {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Idempotency-Key': key,
    },
    body: JSON.stringify(payload),
    signal,
  });

  const result = await response.json();
  if (!response.ok) {
    throw new Error(result.error || 'تعذّر حفظ الطلب. حاول تاني.');
  }
  return result;
}
