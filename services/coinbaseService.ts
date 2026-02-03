/**
 * Coinbase Commerce Payment Service
 * Handles crypto payments via Coinbase Commerce API
 */

const COINBASE_API_KEY = 'fc404e9b-e275-4797-93eb-c9d7c4f9696b';
const COINBASE_API_URL = 'https://api.commerce.coinbase.com';

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
 * Create a new charge (payment request) on Coinbase Commerce
 */
export async function createCharge(params: CreateChargeParams): Promise<CoinbaseCharge | null> {
  try {
    const response = await fetch(`${COINBASE_API_URL}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify({
        name: params.name,
        description: params.description,
        pricing_type: 'fixed_price',
        local_price: {
          amount: params.amount.toString(),
          currency: params.currency || 'USD',
        },
        metadata: params.metadata || {},
        redirect_url: params.redirectUrl || window.location.origin + '?payment=success',
        cancel_url: params.cancelUrl || window.location.origin + '?payment=cancelled',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Coinbase Commerce error:', error);
      return null;
    }

    const data = await response.json();
    return data.data as CoinbaseCharge;
  } catch (error) {
    console.error('Error creating Coinbase charge:', error);
    return null;
  }
}

/**
 * Get charge details by ID
 */
export async function getCharge(chargeId: string): Promise<CoinbaseCharge | null> {
  try {
    const response = await fetch(`${COINBASE_API_URL}/charges/${chargeId}`, {
      headers: {
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.data as CoinbaseCharge;
  } catch (error) {
    console.error('Error getting charge:', error);
    return null;
  }
}

/**
 * Check if a charge has been completed
 */
export async function isChargeCompleted(chargeId: string): Promise<{
  completed: boolean;
  status: string;
}> {
  const charge = await getCharge(chargeId);

  if (!charge) {
    return { completed: false, status: 'unknown' };
  }

  const lastStatus = charge.timeline[charge.timeline.length - 1]?.status || 'NEW';

  return {
    completed: lastStatus === 'COMPLETED',
    status: lastStatus,
  };
}

/**
 * Generate a unique payment ID for tracking
 */
export function generatePaymentId(): string {
  return `REED-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
}
