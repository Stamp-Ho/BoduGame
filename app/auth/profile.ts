"use server";
import { revalidatePath } from "next/cache";
import { requirePlayer } from "@/server/game-rpc";
import { sessionDatabase } from "@/server/auth/config";

export async function getProfileSettings() {
  const player = await requirePlayer();
  const { data, error } = await sessionDatabase().from("game_profiles")
    .select("nickname,real_name,allow_real_name_invites,profile_completed").eq("id",player.id).single();
  if(error) throw new Error("프로필을 불러올 수 없습니다.");
  return { nickname: data.nickname as string, completed: data.profile_completed === true, name: String(data.real_name ?? ""), invites: data.allow_real_name_invites === true };
}

export async function saveProfileSettings(form: FormData) {
  const player = await requirePlayer();
  const name = String(form.get("name") ?? "").trim();
  const nickname = String(form.get("nickname") ?? "").trim();
  if (!nickname || nickname.length > 24) return "닉네임을 1~24자로 입력해 주세요.";
  const invites = form.has("invites");
  if(!name || name.length > 80) return "실명을 1~80자로 입력해 주세요.";
  const {error} = await sessionDatabase().from("game_profiles").update({
    nickname, profile_completed:true, real_name:name, allow_real_name_invites:invites,
  }).eq("id",player.id);
  if (error) return error.code === "23505" ? "이미 사용 중인 닉네임입니다." : "프로필을 저장할 수 없습니다.";
  revalidatePath("/", "layout");
  return "";
}
