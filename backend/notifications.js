// Await delivery before ending the serverless request; notification failures never undo an order.
export async function notifyNewOrder(result) {
  if (result.replayed) return;
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;

  const order = result.order;
  const text = [
    '📦 طلب جديد — س',
    `رقم الطلب: ${order.id}`,
    ...(order.items?.length ? order.items.map(item => `• ${item.productName} × ${item.quantity} — ${item.subtotal} جنيه`) : [`المجسم: ${order.productName}`]),
    `الكمية: ${order.quantity}`,
    `قيمة المنتجات: ${order.subtotal} جنيه`,
    'الحالة: بانتظار التأكيد',
    'راجع بيانات العميل في لوحة الطلبات على Supabase.',
  ].join('\n');

  await sendTelegram(text,order.id);
}

export async function notifyCustomRequest(result) {
  if (result.replayed) return;
  const text = [
    '✦ طلب مجسم مخصص — س',
    'رقم الطلب: ' + result.receipt.id,
    'الكمية: ' + result.receipt.quantity,
    'الوصف: ' + result.details.description.slice(0,500),
    'المقاسات: ' + (result.details.dimensions || 'لم تُحدد'),
    'بانتظار مراجعة الصورة وتحديد السعر.',
    'الصورة وبيانات العميل في قسم الطلبات المخصصة بلوحة الإدارة.',
  ].join('\n');
  await sendTelegram(text,result.receipt.id);
}

async function sendTelegram(text,id) {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chatId) return;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, protect_content: true }),
      signal: AbortSignal.timeout(5000),
    });
    const body = await response.json();
    if (!response.ok || body.ok !== true) {
      console.warn('Telegram order notification failed', { orderId: id, status: response.status });
    }
  } catch {
    // Never log the request URL or error object: Telegram credentials are part of the URL.
    console.warn('Telegram order notification failed', { orderId: id });
  }
}
