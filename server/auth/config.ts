import "server-only";
import { createClient } from "@supabase/supabase-js";

export function authConfig() {
  const url = process.env.SUPABASE_URL;
  const publishableKey = process.env.SUPABASE_PUBLISHABLE_KEY;
  const secret = process.env.SUPABASE_SECRET_KEY;
  const site = process.env.APP_ORIGIN;
  if (!url || !publishableKey || !secret || !site) {
    throw new Error("서버 로그인 설정을 확인해 주세요.");
  }
  return { url, publishableKey, secret, origin: new URL(site).origin };
}

export function sessionDatabase() {
  const { url, secret } = authConfig();
  return createClient(url, secret, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
}

export function localPath(value: unknown) {
  if (typeof value !== "string" || !value.startsWith("/") || value.startsWith("//")) return "/";
  try {
    const base = "https://local.invalid";
    const path = new URL(value, base);
    if (path.origin === base && !path.pathname.startsWith("//")) {
      return path.pathname + path.search + path.hash;
    }
  } catch {}
  return "/";
}
