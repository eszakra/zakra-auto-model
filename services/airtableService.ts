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

    return images;
  } catch (error) {
    console.error('Error fetching portfolio images:', error);
    return [];
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

    return results;
  } catch (error) {
    console.error('Error fetching revenue results:', error);
    return [];
  }
}
