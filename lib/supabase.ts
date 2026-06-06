import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';

export const supabaseUrl = 'https://yqttaeukmnstyxbabkqz.supabase.co';
export const supabaseAnonKey = 'sb_publishable_w-l1OBuQPNrFwTw44Tm8OQ_2E-Vylm-';

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: Platform.OS === 'web' ? (typeof window !== 'undefined' ? window.localStorage : undefined) : AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
