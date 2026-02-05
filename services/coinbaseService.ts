/**
 * Coinbase Commerce Payment Service
 * API calls are proxied through Netlify function to keep API key server-side
 */

const PROXY_URL = '/.netlify/functions/create-charge';

export interface CoinbaseCharge {
  id: string;
  code: string;
  name: string;
  description: string;
  hosted_url: string;
  created_at: string;
  expires_at: string;
  pricing: {
    local: { amount: string; currency: string };
    bitcoin?: { amount: string; currency: string };
    ethereum?: { amount: string; currency: string };
    usdc?: { amount: string; currency: string };
  };
  metadata: Record<string, string>;
  timeline: Array<{
    status: string;
    time: string;
  }>;
}

export interface CreateChargeParams {
  name: string;
  description: string;
  amount: number;
  currency?: string;
  metadata?: Record<string, string>;
  redirectUrl?: string;
  cancelUrl?: string;
}

/**
 * Create a new charge (payment request) via server-side proxy
 */
export async function createCharge(params: CreateChargeParams): Promise<CoinbaseCharge | null> {
  try {
    const response = await fetch(PROXY_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        amount: params.amount,
        metadata: params.metadata || {},
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Payment error:', error);
      return null;
    }

    const data = await response.json();
    return data.data as CoinbaseCharge;
  } catch (error) {
    console.error('Error creating payment:', error);
    return null;
  }
}

/**
 * Generate a unique payment ID for tracking
 */
export function generatePaymentId(): string {
  return `REED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
