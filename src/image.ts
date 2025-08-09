
// 16:9 center-crop + <=1MB JPEG compression
export async function enforceAspectAndCompress(file: File): Promise<Blob> {
  const img = await fileToImage(file);
  const targetW = 1280;
  const targetH = 720;
  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d')!;

  const currentRatio = img.width / img.height;
  let sx=0, sy=0, sw=img.width, sh=img.height;
  if (currentRatio > 16/9) {
    sh = img.height;
    sw = sh * 16/9;
    sx = (img.width - sw) / 2;
    sy = 0;
  } else {
    sw = img.width;
    sh = sw * 9/16;
    sx = 0;
    sy = (img.height - sh) / 2;
  }

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetW, targetH);

  let quality = 0.92;
  let blob: Blob | null = null;
  for (let i=0; i<6; i++) {
    blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('Failed to encode image');
    if (blob.size <= 1024*1024) break;
    quality -= 0.12;
    if (quality < 0.4) break;
  }
  if (!blob) throw new Error('Failed to compress image');
  if (blob.size > 1024*1024) throw new Error('画像サイズが1MBを超えています。別の画像をお試しください。');
  return blob;
}

// コンテンツ画像用: アスペクト比を保持したまま圧縮
export async function compressImageKeepAspect(file: File): Promise<Blob> {
  const img = await fileToImage(file);
  const maxWidth = 1280;
  const maxHeight = 1280;
  
  // アスペクト比を保持しながらリサイズ
  let { width, height } = img;
  if (width > maxWidth || height > maxHeight) {
    const ratio = Math.min(maxWidth / width, maxHeight / height);
    width = width * ratio;
    height = height * ratio;
  }
  
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, width, height);

  let quality = 0.92;
  let blob: Blob | null = null;
  for (let i=0; i<6; i++) {
    blob = await new Promise<Blob | null>(res => canvas.toBlob(res, 'image/jpeg', quality));
    if (!blob) throw new Error('Failed to encode image');
    if (blob.size <= 1024*1024) break;
    quality -= 0.12;
    if (quality < 0.4) break;
  }
  if (!blob) throw new Error('Failed to compress image');
  if (blob.size > 1024*1024) throw new Error('画像サイズが1MBを超えています。別の画像をお試しください。');
  return blob;
}

export async function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = (e) => { URL.revokeObjectURL(url); reject(e); };
    img.src = url;
  });
}
