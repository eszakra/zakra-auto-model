// Admin File Upload Handler
// Uploads files to Supabase Storage using service_role key (bypasses RLS)
// URL: /.netlify/functions/admin-upload

const SUPABASE_URL = process.env.VITE_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

exports.handler = async (event) => {
  // Only POST
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Server not configured' }) };
  }

  try {
    // Parse the multipart body to get metadata
    const body = JSON.parse(event.body);
    const { bucket, path, fileBase64, contentType, adminToken } = body;

    if (!bucket || !path || !fileBase64 || !adminToken) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: 'Missing required fields' }) };
    }

    // Verify the admin token is valid by checking user profile
    const userRes = await fetch(`${SUPABASE_URL}/rest/v1/user_profiles?id=eq.${adminToken}&is_admin=eq.true&select=id`, {
      headers: {
        'apikey': SUPABASE_SERVICE_KEY,
        'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      }
    });

    const userData = await userRes.json();
    if (!userData || userData.length === 0) {
      return { statusCode: 403, headers, body: JSON.stringify({ error: 'Unauthorized: not an admin' }) };
    }

    // Decode base64 file
    const fileBuffer = Buffer.from(fileBase64, 'base64');

    // Upload to Supabase Storage using service_role key (bypasses RLS)
    const uploadRes = await fetch(
      `${SUPABASE_URL}/storage/v1/object/${bucket}/${path}`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
          'apikey': SUPABASE_SERVICE_KEY,
          'Content-Type': contentType || 'application/octet-stream',
          'x-upsert': 'true',
        },
        body: fileBuffer,
      }
    );

    if (!uploadRes.ok) {
      const errText = await uploadRes.text();
      console.error('Upload failed:', errText);
      return { statusCode: uploadRes.status, headers, body: JSON.stringify({ error: `Upload failed: ${errText}` }) };
    }

    // Get public URL
    const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${bucket}/${path}`;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ success: true, url: publicUrl, path }),
    };
  } catch (error) {
    console.error('Admin upload error:', error);
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
