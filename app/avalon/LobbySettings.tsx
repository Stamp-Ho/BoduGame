"use client";
import { useState } from "react";
import { configureRoom } from "./actions";
import { RoomForm } from "./RoomForm";
export function LobbySettings({
  id,
  canManage,
  isPrivate,
  names,
  code,
  refresh,
}: {
  id: string;
  canManage: boolean;
  isPrivate: boolean;
  names: boolean;
  code: string | null;
  refresh: () => Promise<void>;
}) {
  const [open, setOpen] = useState(false),
    [busy, setBusy] = useState(false),
    [status, setStatus] = useState("");
  async function save(priv: boolean, real: boolean) {
    setBusy(true);
    try {
      const result = await configureRoom(id, priv, real);
      if (!result.ok) setStatus(result.error);
      else {
        setOpen(false);
        setStatus("");
        await refresh();
      }
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="flex flex-wrap items-center gap-3">
      {code && (
        <>
          <strong>방 코드 {code}</strong>
          <button
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setStatus("코드를 복사했습니다.");
              } catch {
                setStatus("표시된 코드를 복사해 주세요.");
              }
            }}
          >
            코드 복사
          </button>
        </>
      )}
      {names && <span>실명 사용 방</span>}
      {canManage && (
        <>
          {!isPrivate && (
            <button disabled={busy} onClick={() => void save(true, names)}>
              비공개로 전환
            </button>
          )}
          <button onClick={() => setOpen(true)}>방 설정</button>
        </>
      )}
      <span role="status">{status}</span>
      {open && (
        <RoomForm
          nickname=""
          busy={busy}
          settings={{ private: isPrivate, names }}
          onClose={() => setOpen(false)}
          onSave={(_, p, r) => save(p, r)}
        />
      )}
    </section>
  );
}
