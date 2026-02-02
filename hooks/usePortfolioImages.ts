import { useState, useEffect } from 'react';
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

export function usePortfolioImages(options: UsePortfolioImagesOptions = {}): UsePortfolioImagesResult {
  const [images, setImages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchImages = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const portfolioImages = await fetchPortfolioImages(options.category);
      const urls = portfolioImages.map(img => img.url);
      setImages(urls);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch images'));
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchImages();
  }, [options.category]);

  return {
    images,
    isLoading,
    error,
    refetch: fetchImages,
  };
}
