import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { localPath } from "@/server/auth/config";
import { verifiedUserId } from "@/server/auth/oauth";
import { flowCookie, issueSession } from "@/server/auth/session";

export async function GET(request: Request) {
  const jar = await cookies();
  const flow = jar.get(flowCookie)?.value;
  jar.delete(flowCookie);
  const params = new URL(request.url).searchParams;
  const code = params.get("code");
  let next = "/auth/error";
  if (flow && code) {
    try {
      const { provider, state, nonce, next: returnPath } = JSON.parse(Buffer.from(flow, "base64url").toString());
      if ((provider !== "google" && provider !== "kakao") || typeof nonce !== "string" ||
          typeof state !== "string" || state !== params.get("state")) throw new Error("Invalid flow");
      await issueSession(await verifiedUserId(provider, code, nonce));
      next = localPath(returnPath);
    } catch {
      // A cancelled, expired or superseded login can be retried from the error page.
    }
  }
  const origin = process.env.APP_ORIGIN ? new URL(process.env.APP_ORIGIN).origin : new URL(request.url).origin;
  const response = NextResponse.redirect(new URL(next, origin), 303);
  response.headers.set("Cache-Control", "no-store");
  response.headers.set("Referrer-Policy", "no-referrer");
  return response;
}
