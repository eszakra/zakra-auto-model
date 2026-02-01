# Supabase Configuration Guide

Complete setup instructions for the REED Generator API key management system.

## Table of Contents

1. [Database Setup](#database-setup)
2. [Edge Functions](#edge-functions)
3. [Secrets Configuration](#secrets-configuration)
4. [Admin Panel Usage](#admin-panel-usage)
5. [Troubleshooting](#troubleshooting)

---

## Database Setup

### Step 1: Create system_config Table

Execute this SQL in your Supabase SQL Editor:

```sql
-- Create system_config table for storing configuration values
CREATE TABLE IF NOT EXISTS system_config (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE system_config ENABLE ROW LEVEL SECURITY;

-- Create policy for admin access
CREATE POLICY "Allow admin full access" ON system_config
  FOR ALL
  TO authenticated
  USING (auth.jwt() ->> 'is_admin' = 'true')
  WITH CHECK (auth.jwt() ->> 'is_admin' = 'true');

-- Create policy for service role access
CREATE POLICY "Allow service role full access" ON system_config
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Insert default API key placeholder
INSERT INTO system_config (key, value, description)
VALUES ('gemini_api_key', '', 'Gemini API key for image generation')
ON CONFLICT (key) DO NOTHING;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_system_config_key ON system_config(key);
```

---

## Edge Functions

### Function 1: get-api-key

**Purpose:** Retrieves the current Gemini API key

**Path:** `supabase/functions/get-api-key/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    // First try to get from environment variable (secret)
    const envApiKey = Deno.env.get('GEMINI_API_KEY')
    
    if (envApiKey) {
      return new Response(
        JSON.stringify({ apiKey: envApiKey, source: 'secret' }),
        { headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Fallback: try to get from system_config table
    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (supabaseUrl && supabaseServiceKey) {
      const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
      const supabase = createClient(supabaseUrl, supabaseServiceKey)
      
      const { data, error } = await supabase
        .from('system_config')
        .select('value')
        .eq('key', 'gemini_api_key')
        .single()
      
      if (!error && data?.value) {
        return new Response(
          JSON.stringify({ apiKey: data.value, source: 'database' }),
          { headers: { 'Content-Type': 'application/json' } }
        )
      }
    }
    
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 404, headers: { 'Content-Type': 'application/json' } }
    )
    
  } catch (error) {
    console.error('Error fetching API key:', error)
    return new Response(
      JSON.stringify({ error: 'Failed to fetch API key' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deployment Steps:**
1. Go to Supabase Dashboard → Edge Functions
2. Click "Deploy a new function"
3. Select "Via Editor"
4. Name: `get-api-key`
5. Method: `GET`
6. Paste the code above
7. Click "Deploy"

---

### Function 2: update-api-key

**Purpose:** Updates the Gemini API key (admin only)

**Path:** `supabase/functions/update-api-key/index.ts`

```typescript
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Check if user is admin
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { apiKey } = await req.json()
    
    if (!apiKey || typeof apiKey !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Invalid API key provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    
    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2')
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Update or insert the API key in system_config table
    const { error } = await supabase
      .from('system_config')
      .upsert({ 
        key: 'gemini_api_key', 
        value: apiKey,
        updated_at: new Date().toISOString()
      }, { onConflict: 'key' })

    if (error) {
      console.error('Error updating API key:', error)
      return new Response(
        JSON.stringify({ error: 'Failed to update API key' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, message: 'API key updated successfully' }),
      { headers: { 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})
```

**Deployment Steps:**
1. Go to Supabase Dashboard → Edge Functions
2. Click "Deploy a new function"
3. Select "Via Editor"
4. Name: `update-api-key`
5. Method: `POST`
6. Paste the code above
7. Click "Deploy"

---

## Secrets Configuration

### Required Secrets

Navigate to: **Edge Functions** → **Secrets** → **New Secret**

| Secret Name | Description | How to Get |
|-------------|-------------|------------|
| `GEMINI_API_KEY` | Your Gemini API key for image generation | [Google AI Studio](https://aistudio.google.com/app/apikey) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key for database access | Supabase Dashboard → Project Settings → API |

### Setting Up Secrets

1. Go to **Supabase Dashboard** → **Edge Functions** → **Secrets**
2. Click **"New Secret"**
3. Enter the secret name and value
4. Click **"Add Secret"**
5. Repeat for all required secrets

---

## Admin Panel Usage

### Accessing the API Key Management

1. Log in as an admin user
2. Open the Admin Panel (from the main navigation)
3. Click on the **"API Key"** tab

### Features

#### View Current Status
- **Green checkmark**: API key is configured and working
- **Yellow warning**: No API key found
- Shows the source of the key (Secret or Database)

#### Update API Key
1. Enter the new API key in the input field
   - Must start with `AIza...`
   - Get your key from [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click the eye icon to show/hide the key
3. Click **"Update API Key"**
4. The app will refresh automatically

#### Important Notes
- ✅ Changes take effect immediately for all users
- ✅ No need to restart the application
- ✅ Old key is replaced (cannot be recovered)
- ⚠️ Make sure the new key has sufficient quota

---

## API Key Priority Order

The application checks for the API key in this order:

1. **Edge Secret** (`GEMINI_API_KEY`)
   - Highest priority
   - Set in Supabase Secrets
   - Recommended for production

2. **Database** (`system_config` table)
   - Fallback option
   - Can be updated from Admin Panel
   - Useful for quick changes without redeployment

3. **Environment Variable** (local development only)
   - `VITE_API_KEY` in `.env` file
   - Only for local development

---

## Troubleshooting

### Issue: "API Key Not Configured" Error

**Solution:**
1. Check that `GEMINI_API_KEY` secret is set in Supabase
2. Verify the Edge Function `get-api-key` is deployed
3. Check browser console for detailed error messages

### Issue: Cannot Update API Key from Admin Panel

**Solution:**
1. Verify you're logged in as an admin (`is_admin = true` in user_profiles)
2. Check that `update-api-key` Edge Function is deployed
3. Ensure `SUPABASE_SERVICE_ROLE_KEY` secret is set
4. Check browser console for error details

### Issue: Changes Not Reflecting

**Solution:**
1. Refresh the page after updating the API key
2. Clear browser cache
3. Check that the `system_config` table has the correct value:
   ```sql
   SELECT * FROM system_config WHERE key = 'gemini_api_key';
   ```

### Issue: Edge Function Deployment Fails

**Solution:**
1. Check that all imports are correct
2. Verify Deno version compatibility
3. Check Supabase function logs for errors

---

## File Structure

```
supabase/
├── functions/
│   ├── get-api-key/
│   │   └── index.ts
│   └── update-api-key/
│       └── index.ts
└── migrations/
    └── 001_create_system_config.sql

components/
├── AdminPanelExtended.tsx    (Main admin panel with API key management)
└── AdminPanel.tsx            (Legacy - not used)

App.tsx                       (Main app with API key refresh logic)
```

---

## Security Considerations

1. **Never expose the API key in client-side code**
   - Always use Edge Functions to retrieve keys
   - Keys are never sent to the browser in plain text

2. **Admin-only access**
   - Only users with `is_admin = true` can update the API key
   - Database policies enforce this restriction

3. **Service Role Key**
   - Keep `SUPABASE_SERVICE_ROLE_KEY` secure
   - Never expose it in client-side code
   - Only used in Edge Functions

---

## Support

For issues or questions:
- Check the browser console for error messages
- Review Supabase Edge Function logs
- Verify all secrets are correctly set
- Ensure database migrations have been applied

---

**Last Updated:** 2026-01-31
**Version:** 1.0
