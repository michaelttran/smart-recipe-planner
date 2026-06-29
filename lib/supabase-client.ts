import { Platform } from 'react-native';
import { createClient } from '@supabase/supabase-js';

// Supabase session tokens can exceed SecureStore's 2KB limit — chunk them.
const CHUNK_SIZE = 1024;

async function getSecureStore() {
  const SecureStore = await import('expo-secure-store');
  return SecureStore;
}

const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    const SecureStore = await getSecureStore();
    const chunks: string[] = [];
    for (let i = 0; ; i++) {
      const chunk = await SecureStore.getItemAsync(`${key}_${i}`);
      if (chunk === null) break;
      chunks.push(chunk);
    }
    return chunks.length > 0 ? chunks.join('') : null;
  },
  async setItem(key: string, value: string): Promise<void> {
    const SecureStore = await getSecureStore();
    const chunks = value.match(new RegExp(`.{1,${CHUNK_SIZE}}`, 'g')) ?? [];
    await Promise.all(chunks.map((chunk, i) => SecureStore.setItemAsync(`${key}_${i}`, chunk)));
    for (let i = chunks.length; ; i++) {
      const stale = await SecureStore.getItemAsync(`${key}_${i}`);
      if (stale === null) break;
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
  async removeItem(key: string): Promise<void> {
    const SecureStore = await getSecureStore();
    for (let i = 0; ; i++) {
      const exists = await SecureStore.getItemAsync(`${key}_${i}`);
      if (exists === null) break;
      await SecureStore.deleteItemAsync(`${key}_${i}`);
    }
  },
};

const WebStorageAdapter = {
  async getItem(key: string): Promise<string | null> {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  },
  async removeItem(key: string): Promise<void> {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(key);
  },
};

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://placeholder.supabase.co';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'placeholder';

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      storage: Platform.OS === 'web' ? WebStorageAdapter : SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);
