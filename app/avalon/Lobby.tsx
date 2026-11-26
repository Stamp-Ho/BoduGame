"use client";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useEffect, useState } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { LobbySettings } from "./LobbySettings";
import { RoomForm } from "./RoomForm";
import { RealNameConsent, remembersConsent } from "./RealNameConsent";
import type { AvalonRoomSummary } from "./types";

type Props = {
  user: { id: string; name: string };
  rooms: AvalonRoomSummary[];
  admin: boolean;
  busy: boolean;
  create: (title: string, priv: boolean, names: boolean) => Promise<void>;
  join: (
    id: string | null,
    code: string | null,
    accept: boolean,
  ) => Promise<boolean>;
  refresh: () => Promise<void>;
  stats: () => void;
  manage: (room: AvalonRoomSummary) => void;
};
export function Lobby({
  user,
  rooms,
  admin,
  busy,
  create,
  join,
  refresh,
  stats,
  manage,
}: Props) {
  const [creating, setCreating] = useState(false),
    [confirm, setConfirm] = useState<string | null>(null);
  const [code, setCode] = useState("");
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        setCode(sessionStorage.getItem("avalon-code") ?? "");
      } catch {}
    });
    return () => cancelAnimationFrame(id);
  }, []);
  function changeCode(value: string) {
    setCode(value);
    try {
      sessionStorage.setItem("avalon-code", value);
    } catch {}
  }
  return (
    <div className="space-y-5">
      <section
        aria-labelledby="private-entry-title"
        className="rounded-2xl border border-violet-200 bg-white p-5 sm:p-6"
      >
        <h2
          id="private-entry-title"
          className="flex items-center gap-2 text-lg font-bold text-slate-900"
        >
          <LockKeyhole size={19} className="text-violet-600" />
          비공개 게임 입장
        </h2>
        <form
          className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              user.id &&
              code.trim() &&
              (await join(null, code.trim(), false))
            )
              changeCode("");
          }}
        >
          <input
            aria-label="방 코드"
            className="min-w-0 flex-1 rounded-xl border border-violet-200 bg-violet-50/50 px-4 py-3 font-mono text-base tracking-[.2em] text-slate-900 uppercase placeholder:font-sans placeholder:tracking-normal placeholder:text-slate-400 focus:border-violet-500 focus:outline-2 focus:outline-violet-200"
            value={code}
            onChange={(e) => changeCode(e.target.value)}
            placeholder="방 코드를 입력하세요"
            autoComplete="off"
            autoCapitalize="characters"
            spellCheck={false}
          />
          {user.id ? (
            <button className="button" disabled={busy || !code.trim()}>
              입장
            </button>
          ) : null}
        </form>
        {!user.id && (
          <div className="mt-3">
            <LoginButton />
          </div>
        )}
      </section>
      <section
        aria-labelledby="open-rooms-title"
        className="space-y-4 rounded-2xl border border-violet-200 bg-white p-5 sm:p-6"
      >
        <div className="flex items-center justify-between">
          <h2
            id="open-rooms-title"
            className="text-lg font-bold text-slate-900"
          >
            열려 있는 방
          </h2>
          <Link href="/avalon/preview" className="text-sm underline">
            게임 미리보기
          </Link>
        </div>
        {user.id && (
          <div className="flex gap-3  justify-end">
            <button onClick={stats}>전적 보기</button>
            <button className="button" onClick={() => setCreating(true)}>
              방 만들기
            </button>
          </div>
        )}
        {rooms.map((r) => (
          <div
            key={r.id}
            className="flex flex-wrap items-center gap-3 border-t py-3"
          >
            <strong>{r.title}</strong>
            <span>
              {r.phase === "lobby" ? r.players + "명" : "투표 중"}{" "}
              {r.is_private ? "· 비공개" : ""}{" "}
              {r.use_real_names ? "· 실명 사용" : ""}
            </span>
            {user.id ? (
              r.phase === "lobby" && (
                <button
                  disabled={busy}
                  onClick={() => {
                    const ask = r.use_real_names && !r.is_private;
                    if (ask && !remembersConsent(user.id)) setConfirm(r.id);
                    else void join(r.id, null, ask);
                  }}
                >
                  입장
                </button>
              )
            ) : (
              <LoginButton />
            )}
            {admin && r.phase === "lobby" && (
              <LobbySettings
                id={r.id}
                isPrivate={r.is_private}
                names={r.use_real_names}
                code={null}
                canManage
                refresh={refresh}
              />
            )}
            {admin && (
              <button disabled={busy} onClick={() => manage(r)}>
                {r.phase === "lobby" ? "해산" : "투표 종료"}
              </button>
            )}
          </div>
        ))}
        {!rooms.length && <p>열려 있는 방이 없습니다.</p>}
      </section>
      {creating && (
        <RoomForm
          nickname={user.name}
          busy={busy}
          onClose={() => setCreating(false)}
          onSave={async (...args) => {
            setCreating(false);
            await create(...args);
          }}
        />
      )}
      {confirm && (
        <RealNameConsent
          id={user.id}
          onClose={() => setConfirm(null)}
          onAccept={() => {
            const id = confirm;
            setConfirm(null);
            void join(id, null, true);
          }}
        />
      )}
    </div>
  );
}
