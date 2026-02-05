// Signup Rate Limiter - Prevents multi-account abuse
// Endpoint: /.netlify/functions/signup-guard
// Actions: "check" (before signup) and "log" (after successful signup)

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Content-Type': 'application/json',
};

// Extract real IP from Netlify headers
function getClientIP(event) {
  return (
    event.headers['x-nf-client-connection-ip'] ||
    event.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    event.headers['client-ip'] ||
    'unknown'
  );
}

exports.handler = async (event) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: CORS_HEADERS, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers: CORS_HEADERS,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    // If not configured, allow signup (don't block)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ allowed: true }),
    };
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const action = body.action; // "check" or "log"
    const fingerprint = body.fingerprint || null;
    const email = body.email || null;
    const ip = getClientIP(event);
    const userAgent = event.headers['user-agent'] || '';

    if (action === 'check') {
      // ── CHECK: Is this IP/device allowed to sign up? ──
      const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/check_signup_allowed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
        },
        body: JSON.stringify({
          p_ip: ip,
          p_fingerprint: fingerprint,
        }),
      });

      if (!response.ok) {
        // If RPC fails, allow signup (don't block legitimate users)
        console.error('check_signup_allowed RPC error:', await response.text());
        return {
          statusCode: 200,
          headers: CORS_HEADERS,
          body: JSON.stringify({ allowed: true }),
        };
      }

      const result = await response.json();

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify(result),
      };

    } else if (action === 'log') {
      // ── LOG: Record this signup attempt ──
      const response = await fetch(`${SUPABASE_URL}/rest/v1/signup_attempts`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_SERVICE_KEY,
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({
          ip_address: ip,
          device_fingerprint: fingerprint,
          email: email,
          user_agent: userAgent.substring(0, 500),
          success: true,
        }),
      });

      if (!response.ok) {
        console.error('Log signup error:', await response.text());
      }

      return {
        statusCode: 200,
        headers: CORS_HEADERS,
        body: JSON.stringify({ logged: true }),
      };

    } else {
      return {
        statusCode: 400,
        headers: CORS_HEADERS,
        body: JSON.stringify({ error: 'Invalid action. Use "check" or "log".' }),
      };
    }
  } catch (error) {
    console.error('Signup guard error:', error);
    // On error, allow signup (don't block)
    return {
      statusCode: 200,
      headers: CORS_HEADERS,
      body: JSON.stringify({ allowed: true }),
    };
  }
};
