import { createClient } from '@supabase/supabase-js';
import { firebaseAuth } from './firebase';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_ANON_KEY. Copy .env.example to .env.',
  );
}

/**
 * Supabase client authenticated via Firebase ID tokens.
 * @see https://supabase.com/docs/guides/auth/third-party/firebase-auth
 */
export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '', {
  accessToken: async () => {
    const user = firebaseAuth().currentUser;
    if (!user) return null;
    return user.getIdToken(true);
  },
});
