// Airtable Proxy - Keeps API token server-side
// Endpoint: /.netlify/functions/airtable-proxy?table=Portfolio&category=sfw

const AIRTABLE_API_TOKEN = process.env.AIRTABLE_API_TOKEN || process.env.VITE_AIRTABLE_API_TOKEN;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || process.env.VITE_AIRTABLE_BASE_ID;

exports.handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  if (!AIRTABLE_API_TOKEN || !AIRTABLE_BASE_ID) {
    return { statusCode: 500, body: JSON.stringify({ error: 'Airtable not configured' }) };
  }

  const params = event.queryStringParameters || {};
  const table = params.table;
  const category = params.category;

  // Whitelist allowed tables
  const allowedTables = ['Portfolio', 'Revenue'];
  if (!table || !allowedTables.includes(table)) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Invalid table' }) };
  }

  try {
    let filterFormula = '{active}=1';
    if (category && table === 'Portfolio') {
      // Sanitize category input
      const safeCategory = category.replace(/[^a-zA-Z]/g, '');
      filterFormula = `AND({active}=1,{category}="${safeCategory}")`;
    }

    const queryParams = new URLSearchParams({ filterByFormula: filterFormula });
    const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${table}?${queryParams}`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${AIRTABLE_API_TOKEN}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      return { statusCode: response.status, body: JSON.stringify({ error: 'Airtable error' }) };
    }

    const data = await response.json();

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Cache-Control': 'public, max-age=300', // Cache 5 min
      },
      body: JSON.stringify(data),
    };
  } catch (error) {
    console.error('Airtable proxy error:', error);
    return { statusCode: 500, body: JSON.stringify({ error: 'Internal error' }) };
  }
};
