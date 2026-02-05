// Coinbase Commerce Proxy - Keeps API key server-side
// Endpoint: /.netlify/functions/create-charge

const COINBASE_API_KEY = process.env.COINBASE_API_KEY;
const COINBASE_API_URL = 'https://api.commerce.coinbase.com';
const SITE_URL = process.env.URL || 'https://usereed.com';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!COINBASE_API_KEY) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Payment system not configured' }) };
  }

  try {
    const body = JSON.parse(event.body || '{}');

    // Validate required fields
    if (!body.name || !body.amount || body.amount <= 0) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid charge parameters' }) };
    }

    // Validate amount matches known service prices (anti-tampering)
    const validPrices = [29, 47, 59, 99, 147, 199, 297, 397, 597, 697, 997];
    if (!validPrices.includes(body.amount)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid price' }) };
    }

    const response = await fetch(`${COINBASE_API_URL}/charges`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CC-Api-Key': COINBASE_API_KEY,
        'X-CC-Version': '2018-03-22',
      },
      body: JSON.stringify({
        name: body.name,
        description: body.description || '',
        pricing_type: 'fixed_price',
        local_price: {
          amount: body.amount.toString(),
          currency: 'USD',
        },
        metadata: body.metadata || {},
        redirect_url: `${SITE_URL}?payment=success`,
        cancel_url: `${SITE_URL}?payment=cancelled`,
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error('Coinbase error:', error);
      return { statusCode: response.status, body: JSON.stringify({ error: 'Payment creation failed' }) };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ data: data.data }),
    };
  } catch (error) {
    console.error('Create charge error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
