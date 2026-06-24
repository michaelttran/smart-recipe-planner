import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

// Supabase session tokens can exceed SecureStore's 2KB limit — chunk them.
const CHUNK_SIZE = 1024;

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk === null) break;
      chunks.push(chunk);
    }
    return chunks.length > 0 ? chunks.join('') : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
    // Remove stale trailing chunks from a previous longer value
    for (let i = chunks.length; ; i++) {
      const stale = await SecureStore.getItemAsync(`${key}_${i}`);
      if (stale === null) break;
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    for (let i = 0; ; i++) {
      const exists = await SecureStore.getItemAsync(`${key}_${i}`);
      if (exists === null) break;
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
