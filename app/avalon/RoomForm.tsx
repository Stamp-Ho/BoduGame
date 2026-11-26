"use client";
import { Check } from "lucide-react";
import { GameDialog } from "@/components/GameDialog";
export function RoomForm({
  nickname,
  settings,
  onSave,
  onClose,
  busy,
}: {
  nickname: string;
  settings?: { private: boolean; names: boolean };
  onSave: (title: string, isPrivate: boolean, names: boolean) => Promise<void>;
  onClose: () => void;
  busy: boolean;
}) {
  return (
    <GameDialog title={settings ? "방 설정" : "방 만들기"} onClose={onClose}>
      <form
        className="grid gap-4 text-sm text-slate-900"
        action={async (f) => {
          await onSave(
            String(f.get("title") ?? ""),
            f.has("private"),
            f.has("names"),
          );
        }}
      >
        {!settings && (
          <label>
            방 제목
            <input
              className="mt-2 block w-full rounded-lg border border-violet-200 bg-white p-2.5 focus:outline-2 focus:outline-violet-500"
              name="title"
              maxLength={100}
              placeholder={nickname + "의 게임"}
            />
          </label>
        )}
        <div className="flex flex-wrap gap-2">
          <RoomOption name="private" label="비공개" checked={settings?.private} disabled={busy}/>
          <RoomOption name="names" label="실명 사용" checked={settings?.names} disabled={busy}/>
        </div>
        <button className="button" disabled={busy}>
          {settings ? "저장" : "생성"}
        </button>
      </form>
    </GameDialog>
  );
}


function RoomOption({ name, label, checked, disabled }: {
  name: string; label: string; checked?: boolean; disabled: boolean;
}) {
  return <label className="relative inline-flex cursor-pointer items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-600 has-[:checked]:border-violet-500 has-[:checked]:bg-violet-100 has-[:checked]:text-violet-900 has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-offset-2 has-[:focus-visible]:outline-violet-500 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50">
    <input type="checkbox" name={name} defaultChecked={checked} disabled={disabled} className="peer sr-only"/>
    <span className="flex size-4 items-center justify-center rounded-full border border-slate-300 bg-white peer-checked:border-violet-600 peer-checked:bg-violet-600 peer-checked:text-white text-transparent">
      <Check size={12} strokeWidth={3} aria-hidden="true"/>
    </span>
    {label}
  </label>;
}
