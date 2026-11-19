export async function prepareProductImage(file) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 15 * 1024 * 1024) {
    throw new Error('اختار صورة JPG أو PNG أو WebP، أصغر من ١٥ ميجابايت.');
  }
  const localUrl = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = localUrl;
    await image.decode();
    if (!image.naturalWidth || image.naturalWidth * image.naturalHeight > 40000000) throw new Error('أبعاد الصورة كبيرة جدًا. جرّب صورة أصغر.');
    const scale = Math.min(1, 1600 / Math.max(image.naturalWidth, image.naturalHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
    canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
    canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
    for (const quality of [0.85, 0.7, 0.5]) {
      const result = canvas.toDataURL('image/webp', quality);
      const data = result.split(',')[1];
      if (!result.startsWith('data:image/webp;')) throw new Error('المتصفح لا يدعم تجهيز الصورة. جرّب Chrome.');
      if (data.length <= 2097152) return { data, preview: result };
    }
    throw new Error('الصورة لسه كبيرة بعد الضغط. جرّب صورة أصغر.');
  } finally { URL.revokeObjectURL(localUrl); }
}
