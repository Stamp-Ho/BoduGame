"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { localPath } from "@/server/auth/config";
import { startOAuth } from "@/server/auth/oauth";
import { cookieOptions, flowCookie, revokeSession } from "@/server/auth/session";

export async function login(_previous: string, form: FormData) {
  const provider = form.get("provider");
  if (provider !== "google") return "로그인 방식을 선택해 주세요.";
  let location: string;
  try {
    const flow = startOAuth();
    location = flow.location;
    const next = localPath(form.get("next"));
    const value = JSON.stringify({ provider, state: flow.state, nonce: flow.nonce, next: next.length <= 1500 ? next : "/" });
    (await cookies()).set(flowCookie, Buffer.from(value).toString("base64url"), {
      ...cookieOptions, maxAge: 600,
    });
  } catch {
    return "로그인을 시작할 수 없습니다. 잠시 후 다시 시도해 주세요.";
  }
  redirect(location);
}

export async function logout() {
  await revokeSession();
  revalidatePath("/", "layout");
}
