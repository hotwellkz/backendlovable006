import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Missing required Supabase environment variables');
  throw new Error('Missing required Supabase environment variables');
}

console.log('Initializing Supabase client with config:', {
  url: process.env.SUPABASE_URL,
  hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  region: process.env.SUPABASE_STORAGE_REGION || 'eu-central-1',
  storageEndpoint: process.env.SUPABASE_STORAGE_ENDPOINT
});

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    db: {
      schema: 'public'
    },
    global: {
      headers: { 'x-my-custom-header': 'my-app-name' },
    },
    storage: {
      storageApiKey: process.env.SUPABASE_STORAGE_ACCESS_KEY,
      storageSecretKey: process.env.SUPABASE_STORAGE_SECRET_KEY
    }
  }
);

// Проверяем подключение к storage
supabase.storage.listBuckets().then(({ data, error }) => {
  if (error) {
    console.error('Error connecting to Supabase Storage:', error);
  } else {
    console.log('Successfully connected to Supabase Storage. Available buckets:', data);
  }
});
