/**
 * Airtable Service - Portfolio Images & Revenue Results
 * Production: proxied through Netlify function (token stays server-side)
 * Development: direct API calls using VITE_ env vars
 */

const isDev = import.meta.env.DEV;
const PROXY_URL = '/.netlify/functions/airtable-proxy';
const AIRTABLE_TOKEN = import.meta.env.VITE_AIRTABLE_API_TOKEN;
const AIRTABLE_BASE = import.meta.env.VITE_AIRTABLE_BASE_ID;

export interface PortfolioImage {
  id: string;
  url: string;
  category: 'sfw' | 'nsfw';
  order: number;
  active: boolean;
}

interface AirtableAttachment {
  id: string;
  url: string;
  filename: string;
  type: string;
  thumbnails?: {
    small: { url: string };
    large: { url: string };
    full: { url: string };
  };
}

interface AirtableRecord {
  id: string;
  fields: {
    image?: AirtableAttachment[];
    category?: string;
    order?: number;
    active?: boolean;
  };
}

interface AirtableResponse {
  records: AirtableRecord[];
  offset?: string;
}

async function airtableFetch(table: string, category?: string): Promise<AirtableResponse> {
  if (isDev && AIRTABLE_TOKEN && AIRTABLE_BASE) {
    // Development: direct API call
    let filterFormula = '{active}=1';
    if (category && table === 'Portfolio') {
      const safeCategory = category.replace(/[^a-zA-Z]/g, '');
      filterFormula = `AND({active}=1,{category}="${safeCategory}")`;
    }
    const queryParams = new URLSearchParams({ filterByFormula: filterFormula });
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE}/${table}?${queryParams}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) throw new Error(`Airtable error: ${response.status}`);
    return response.json();
  } else {
    // Production: use Netlify proxy
    const params = new URLSearchParams({ table });
    if (category) params.set('category', category);

    const response = await fetch(`${PROXY_URL}?${params}`);
    if (!response.ok) throw new Error(`API error: ${response.status}`);
    return response.json();
  }
}

// ============================================
// FALLBACK DATA (When Airtable API limit is exceeded)
// ============================================

const FALLBACK_PORTFOLIO_SFW: PortfolioImage[] = [
  { id: 'fb_1', url: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 1, active: true },
  { id: 'fb_2', url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 2, active: true },
  { id: 'fb_3', url: 'https://images.unsplash.com/photo-1557053910-d9eadeed1c58?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 3, active: true },
  { id: 'fb_4', url: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 4, active: true },
  { id: 'fb_5', url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 5, active: true },
  { id: 'fb_6', url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800', category: 'sfw', order: 6, active: true },
];

const FALLBACK_PORTFOLIO_NSFW: PortfolioImage[] = [
  { id: 'fb_n1', url: 'https://images.unsplash.com/photo-1620815185966-23cbcc70f9cc?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 1, active: true },
  { id: 'fb_n2', url: 'https://images.unsplash.com/photo-1515886657613-9f3515b0c78f?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 2, active: true },
  { id: 'fb_n3', url: 'https://images.unsplash.com/photo-1616091093714-c64882e9ab55?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 3, active: true },
  { id: 'fb_n4', url: 'https://images.unsplash.com/photo-1583008535492-4113cefc0515?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 4, active: true },
  { id: 'fb_n5', url: 'https://images.unsplash.com/photo-1588636153946-f94bc586fe7f?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 5, active: true },
  { id: 'fb_n6', url: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800', category: 'nsfw', order: 6, active: true },
];

const FALLBACK_REVENUE: RevenueResult[] = [
  { id: 'rev_1', imageUrl: 'https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?auto=format&fit=crop&q=80&w=800' },
  { id: 'rev_2', imageUrl: 'https://images.unsplash.com/photo-1579621970563-ebec7560ff3e?auto=format&fit=crop&q=80&w=800' },
  { id: 'rev_3', imageUrl: 'https://images.unsplash.com/photo-1633158829585-23ba8f7c8caf?auto=format&fit=crop&q=80&w=800' },
  { id: 'rev_4', imageUrl: 'https://images.unsplash.com/photo-1526304640581-d334cdbbf45e?auto=format&fit=crop&q=80&w=800' },
  { id: 'rev_5', imageUrl: 'https://images.unsplash.com/photo-1531538512162-8e1476b7ecca?auto=format&fit=crop&q=80&w=800' },
  { id: 'rev_6', imageUrl: 'https://images.unsplash.com/photo-1630149462168-96f3068e82a6?auto=format&fit=crop&q=80&w=800' },
];

export async function fetchPortfolioImages(category?: 'sfw' | 'nsfw'): Promise<PortfolioImage[]> {
  try {
    const data = await airtableFetch('Portfolio', category);

    const images: PortfolioImage[] = data.records
      .filter(record => record.fields.image && record.fields.image.length > 0)
      .map(record => ({
        id: record.id,
        url: record.fields.image![0].thumbnails?.full?.url || record.fields.image![0].url,
        category: (record.fields.category as 'sfw' | 'nsfw') || 'sfw',
        order: record.fields.order || 0,
        active: record.fields.active ?? true,
      }));

    if (images.length === 0) throw new Error("No images found, falling back");
    return images;
  } catch (error) {
    console.warn('Error fetching portfolio images, using fallback data:', error);
    return category === 'nsfw' ? FALLBACK_PORTFOLIO_NSFW : FALLBACK_PORTFOLIO_SFW;
  }
}

// ============================================
// REVENUE RESULTS
// ============================================

export interface RevenueResult {
  id: string;
  imageUrl: string;
}

interface RevenueAirtableRecord {
  id: string;
  fields: {
    image?: AirtableAttachment[];
    active?: boolean;
  };
}

export async function fetchRevenueResults(): Promise<RevenueResult[]> {
  try {
    const data = await airtableFetch('Revenue') as { records: RevenueAirtableRecord[] };

    const results: RevenueResult[] = data.records
      .filter(record => record.fields.image && record.fields.image.length > 0)
      .map(record => ({
        id: record.id,
        imageUrl: record.fields.image![0].thumbnails?.full?.url || record.fields.image![0].url,
      }));

    if (results.length === 0) throw new Error("No revenue results found, falling back");
    return results;
  } catch (error) {
    console.warn('Error fetching revenue results, using fallback data:', error);
    return FALLBACK_REVENUE;
  }
}
