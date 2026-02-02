import { useState, useEffect, useRef } from 'react';
import { fetchPortfolioImages, PortfolioImage } from '../services/airtableService';

interface UsePortfolioImagesOptions {
  category?: 'sfw' | 'nsfw';
}

interface UsePortfolioImagesResult {
  images: string[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

// In-memory cache with 5 minute TTL
const imageCache: Record<string, { urls: string[]; timestamp: number }> = {};
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(category?: string): string {
  return `portfolio_${category || 'all'}`;
}

function getFromCache(key: string): string[] | null {
  const cached = imageCache[key];
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.urls;
  }
  return null;
}

function setCache(key: string, urls: string[]): void {
  imageCache[key] = { urls, timestamp: Date.now() };
}

export function usePortfolioImages(options: UsePortfolioImagesOptions = {}): UsePortfolioImagesResult {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const fetchImages = async (skipCache = false) => {
    const cacheKey = getCacheKey(options.category);

    // Check cache first (unless forced refresh)
    if (!skipCache) {
      const cached = getFromCache(cacheKey);
      if (cached) {
        setImages(cached);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(true);
    setError(null);

    try {
      const portfolioImages = await fetchPortfolioImages(options.category);
      const urls = portfolioImages.map(img => img.url);

      if (mountedRef.current) {
        setImages(urls);
        setCache(cacheKey, urls);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Failed to fetch images'));
      }
    } finally {
      if (mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    fetchImages();
    return () => { mountedRef.current = false; };
  }, [options.category]);

  return {
    images,
    isLoading,
    error,
    refetch: () => fetchImages(true),
  };
}
