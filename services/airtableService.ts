/**
 * Airtable Service - Portfolio Images
 */

const AIRTABLE_API_TOKEN = import.meta.env.VITE_AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = import.meta.env.VITE_AIRTABLE_BASE_ID;
const AIRTABLE_TABLE_NAME = import.meta.env.VITE_AIRTABLE_TABLE_NAME || 'Portfolio';

const AIRTABLE_API_URL = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${AIRTABLE_TABLE_NAME}`;

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

export async function fetchPortfolioImages(category?: 'sfw' | 'nsfw'): Promise<PortfolioImage[]> {
  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    console.warn('Airtable credentials not configured');
    return [];
  }

  try {
    // Build filter formula
    let filterFormula = '{active}=1';
    if (category) {
      filterFormula = `AND({active}=1,{category}="${category}")`;
    }

    const params = new URLSearchParams({
      filterByFormula: filterFormula,
      'sort[0][field]': 'order',
      'sort[0][direction]': 'asc',
    });

    const response = await fetch(`${AIRTABLE_API_URL}?${params}`, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Airtable API error: ${response.status}`);
    }

    const data: AirtableResponse = await response.json();

    // Transform Airtable records to our format
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
    console.error('Error fetching portfolio images from Airtable:', error);
    return [];
  }
}
