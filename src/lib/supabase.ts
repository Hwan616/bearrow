import { createClient } from "@supabase/supabase-js";

import { supabaseConfig } from "@/config/env";

import { largeSecureStore } from "./largeSecureStore";

// Supabase URL/Key 가 환경변수에 없으면 미연결 상태로 취급한다
export const isSupabaseConfigured = Boolean(supabaseConfig.url && supabaseConfig.anonKey);

// URL이 없을 때도 createClient 자체는 유효한 값이 필요하다.
// 미설정 시 autoRefreshToken/persistSession 을 모두 끄면 네트워크 호출이 발생하지 않는다.
const url = supabaseConfig.url || "https://placeholder.supabase.co";
const anonKey = supabaseConfig.anonKey || "placeholder";

export const supabase = createClient(url, anonKey, {
  auth: {
    storage: isSupabaseConfigured ? largeSecureStore : undefined,
    autoRefreshToken: isSupabaseConfigured,
    persistSession: isSupabaseConfigured,
    detectSessionInUrl: false,
  },
});
