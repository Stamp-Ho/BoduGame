import "server-only";
import { randomBytes, createHash } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { authConfig } from "./config";



function providerConfig() {
  const id = process.env.GOOGLE_CLIENT_ID;
  const secret = process.env.GOOGLE_CLIENT_SECRET;
  if (!id || !secret) throw new Error("로그인 제공자 설정이 필요합니다.");
  return {
    id, secret, redirect: authConfig().origin + "/auth/callback",
    authorize: "https://accounts.google.com/o/oauth2/v2/auth",
    token: "https://oauth2.googleapis.com/token",
    scope: "openid email",
  };
}

export function startOAuth() {
  const config = providerConfig();
  const state = randomBytes(32).toString("base64url");
  const nonce = randomBytes(32).toString("base64url");
  const url = new URL(config.authorize);
  url.search = new URLSearchParams({
    response_type: "code", client_id: config.id, redirect_uri: config.redirect,
    scope: config.scope, state, nonce: createHash("sha256").update(nonce).digest("hex"),
  }).toString();
  return { location: url.href, state, nonce };
}

export async function verifiedUserId(code: string, nonce: string) {
  const config = providerConfig();
  const response = await fetch(config.token, {
    method: "POST", redirect: "error", cache: "no-store",
    body: new URLSearchParams({
      grant_type: "authorization_code", client_id: config.id, client_secret: config.secret,
      redirect_uri: config.redirect, code,
    }),
  });
  if (!response.ok) throw new Error("인증 코드 교환에 실패했습니다.");
  const tokens = await response.json();
  if (typeof tokens.id_token !== "string") throw new Error("ID 토큰이 없습니다.");

  const { url, publishableKey } = authConfig();
  const client = createClient(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await client.auth.signInWithIdToken({
    provider: "google", token: tokens.id_token, access_token: tokens.access_token, nonce,
  });
  if (error || !data.user) throw new Error("계정을 확인할 수 없습니다.");
  return data.user.id;
}
