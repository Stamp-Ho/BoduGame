"use client";
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
        className="grid gap-4"
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
              className="block w-full border p-2"
              name="title"
              maxLength={100}
              placeholder={nickname + "의 게임"}
            />
          </label>
        )}
        <label>
          <input
            type="checkbox"
            name="private"
            defaultChecked={settings?.private}
          />{" "}
          비공개
        </label>
        <label>
          <input
            type="checkbox"
            name="names"
            defaultChecked={settings?.names}
          />{" "}
          실명 사용
        </label>
        <button className="button" disabled={busy}>
          {settings ? "저장" : "생성"}
        </button>
      </form>
    </GameDialog>
  );
}
