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
