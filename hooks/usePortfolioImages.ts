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

// Fallback images when Airtable is not configured
const FALLBACK_IMAGES = [
  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=400&h=500&fit=crop',
  'https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&h=500&fit=crop',
];

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

      // Use fallback images if Airtable returns empty
      if (urls.length === 0) {
        setImages(FALLBACK_IMAGES);
      } else {
        setImages(urls);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch images'));
      // Use fallback images on error
      setImages(FALLBACK_IMAGES);
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
