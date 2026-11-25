import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cache } from "react";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { sessionDatabase } from "./config";

const secure = process.env.NODE_ENV === "production";
export const cookieOptions = { path: "/", secure, httpOnly: true, sameSite: "lax" as const };
export const flowCookie = secure ? "__Host-bodu-flow" : "bodu-flow";
const sessionCookie = secure ? "__Host-bodu-session" : "bodu-session";
const lifetime = 60 * 60 * 24 * 30;
const digest = (value: string) => createHash("sha256").update(value).digest("hex");

export async function issueSession(userId: string) {
  const token = randomBytes(32).toString("base64url");
  const { error } = await sessionDatabase().rpc("issue_game_session", {
    p_user: userId, p_digest: digest(token),
    p_expires: new Date(Date.now() + lifetime * 1000).toISOString(),
  });
  if (error) throw new Error("세션 생성에 실패했습니다.");
  (await cookies()).set(sessionCookie, token, { ...cookieOptions, maxAge: lifetime });
}

export const currentPlayer = cache(async () => {
  const token = (await cookies()).get(sessionCookie)?.value;
  if (!token) return null;
  await connection();
  const { data, error } = await sessionDatabase().from("game_sessions")
    .select("player:game_profiles!inner(id, nickname, role)")
    .eq("digest", digest(token)).gt("expires_at", new Date().toISOString())
    .maybeSingle<{ player: { id: string; nickname: string; role: string } }>();
  if (error) throw new Error("로그인 상태를 확인할 수 없습니다.");
  return data?.player ?? null;
});

export async function revokeSession() {
  const jar = await cookies();
  const token = jar.get(sessionCookie)?.value;
  if (token) {
    const { error } = await sessionDatabase().from("game_sessions").delete().eq("digest", digest(token));
    if (error) throw new Error("로그아웃에 실패했습니다.");
  }
  jar.delete(sessionCookie);
}
