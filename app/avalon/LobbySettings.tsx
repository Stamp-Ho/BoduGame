"use client";
import { Settings, LockKeyhole, Copy } from "lucide-react";
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
    <section className="contents">
      {code && (
        <>
          <button
            type="button"
            aria-label="방 코드"
            title="방 코드"
            className="inline-flex items-center gap-1.5 -ml-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-800"
            onClick={async () => {
              try {
                await navigator.clipboard.writeText(code);
                setStatus("복사됨!");
              } catch {
                setStatus("실패!");
              } finally {
                setTimeout(() => setStatus(""), 2000);
              }
            }}
          >
            {status || code}
            <Copy size={14} />
          </button>
        </>
      )}
      {names && <span>실명 사용 방</span>}
      {canManage && (
        <>
          {!isPrivate && (
            <button
              className="rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm text-violet-800"
              disabled={busy}
              onClick={() => void save(true, names)}
            >
              비공개 전환
            </button>
          )}
          <button
            type="button"
            aria-label="방 설정"
            title="방 설정"
            aria-haspopup="dialog"
            aria-expanded={open}
            className="order-last inline-flex items-center justify-center rounded-full border border-violet-200 bg-white p-2 text-violet-800"
            onClick={() => setOpen(true)}
          >
            <Settings size={16} />
          </button>
        </>
      )}
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
