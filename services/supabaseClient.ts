import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://obtuhkszoudwypklhvyq.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9idHVoa3N6b3Vkd3lwa2xodnlxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgwMTU3MDYsImV4cCI6MjA4MzU5MTcwNn0.CoaXMkWPfH5vXXuFsV9WxpoLYOkFJfLCEbOchMBIuzA';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export const uploadBase64Image = async (base64Data: string, bucket: string, path: string) => {
    const byteCharacters = atob(base64Data.split(',')[1]);
    const byteNumbers = new Array(byteCharacters.length);
    for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i);
    }
    const byteArray = new Uint8Array(byteNumbers);
    const blob = new Blob([byteArray], { type: 'image/png' });

    const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, blob, {
            contentType: 'image/png',
            upsert: false
        });

    if (error) throw error;

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(path);
    return publicData.publicUrl;
};