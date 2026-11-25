"use client";
import { useState, useTransition } from "react";
import { UserRound } from "lucide-react";
import { GameDialog } from "../GameDialog";
import { getProfileSettings, saveProfileSettings } from "@/app/auth/profile";
import { logout } from "@/app/auth/actions";

type Profile = Awaited<ReturnType<typeof getProfileSettings>>;
const field = "mt-1 block w-full rounded-lg border border-[#c9cec3] bg-[#fffefa] p-2.5";

export function ProfileSettings({ initial }: { initial: Profile }) {
  const [profile, setProfile] = useState(initial);
  const [open, setOpen] = useState(!initial.completed);
  const [busy, start] = useTransition();
  const [error, setError] = useState("");
  return <>
    <button type="button" onClick={() => { setError(""); setOpen(true); }}
      aria-label="내 정보 수정" className="rounded-full border border-[#c9cec3] p-2.5">
      <UserRound size={20}/>
    </button>
    {open && <GameDialog title={profile.completed ? "내 정보 수정" : "내 정보 등록"} onClose={() => { if(profile.completed) setOpen(false); }}>
      <form className="grid gap-4 text-sm" action={form => start(async () => {
        try {
          const message = await saveProfileSettings(form);
          setError(message);
          if (!message) { setProfile(await getProfileSettings()); setOpen(false); }
        } catch { setError("정보를 저장하지 못했습니다. 다시 시도해 주세요."); }
      })}>
        <label>닉네임<input required name="nickname" maxLength={24} defaultValue={profile.nickname} className={field}/></label>
        <label>실명<input required name="name" maxLength={80} defaultValue={profile.name} className={field}/></label>
        <label className="flex items-center gap-2"><input type="checkbox" name="invites" defaultChecked={profile.completed ? profile.invites : true}/> 주루마블에서 실명으로 초대받기</label>
        {error && <p role="alert">{error}</p>}
        <button className="button" disabled={busy}>{busy ? "저장 중…" : "저장"}</button>
      </form>
      <form action={logout} className="border-t border-[#d8dacf] pt-4">
        <button disabled={busy} className="text-sm text-[#52675e]">로그아웃</button>
      </form>
    </GameDialog>}
  </>;
}
