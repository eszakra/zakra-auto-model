/**
 * Image optimization utility using wsrv.nl proxy
 * Converts images to WebP format with resizing and caching
 */

interface OptimizeOptions {
  width?: number;
  height?: number;
  quality?: number;
  fit?: 'cover' | 'contain' | 'fill' | 'inside' | 'outside';
}

export function optimizeImage(url: string, options: OptimizeOptions = {}): string {
  if (!url) return '';

  // Skip if already optimized or is a data URL
  if (url.startsWith('data:') || url.includes('wsrv.nl')) {
    return url;
  }

  const { width = 400, height = 500, quality = 80, fit = 'cover' } = options;

  // Use wsrv.nl image proxy for WebP conversion and optimization
  const params = new URLSearchParams({
    url: url,
    w: width.toString(),
    h: height.toString(),
    fit: fit,
    output: 'webp',
    q: quality.toString(),
  });

  return `https://wsrv.nl/?${params.toString()}`;
}

export function optimizeImageForCarousel(url: string): string {
  return optimizeImage(url, {
    width: 520,  // 2x for retina displays (260px display size)
    height: 640, // 2x for retina displays (320px display size)
    quality: 80,
    fit: 'cover',
  });
}
