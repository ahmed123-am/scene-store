export async function adminApi(action, body, signal) {
  const controller = signal ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), 25000) : null;
  try {
    const response = await fetch('/api/admin?action=' + action, {
      method: body === undefined ? 'GET' : 'POST', credentials: 'same-origin', cache: 'no-store', signal: signal || controller.signal,
      headers: body === undefined ? {} : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) { const error = new Error(data.error || 'تعذّر إتمام العملية.'); error.status = response.status; throw error; }
    return data;
  } finally { if (timer) clearTimeout(timer); }
}
