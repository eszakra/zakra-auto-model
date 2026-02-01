#!/bin/bash

# ============================================
# CREATE SUPABASE EDGE FUNCTION FOR API KEY
# ============================================
# Run these commands in your terminal
# ============================================

# 1. Install Supabase CLI if you haven't
npm install -g supabase

# 2. Login to Supabase
supabase login

# 3. Link your project
supabase link --project-ref your-project-ref

# 4. Create the edge function
supabase functions new get-api-key

# 5. Copy this code to supabase/functions/get-api-key/index.ts:
cat > supabase/functions/get-api-key/index.ts << 'EOF'
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  // Get API key from Supabase Secrets
  const apiKey = Deno.env.get('GEMINI_API_KEY')
  
  if (!apiKey) {
    return new Response(
      JSON.stringify({ error: 'API key not configured' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ apiKey }),
    { headers: { 'Content-Type': 'application/json' } }
  )
})
EOF

# 6. Set your API key as a secret
supabase secrets set GEMINI_API_KEY=your-actual-api-key-here

# 7. Deploy the function
supabase functions deploy get-api-key

# 8. Done! The function will be available at:
# https://your-project-ref.supabase.co/functions/v1/get-api-key

echo "============================================"
echo "Edge Function created successfully!"
echo "============================================"
echo ""
echo "Your API key is now stored securely in Supabase Secrets"
echo "To update it later, run:"
echo "  supabase secrets set GEMINI_API_KEY=new-api-key"
echo ""
echo "The app will fetch it automatically from the edge function"
