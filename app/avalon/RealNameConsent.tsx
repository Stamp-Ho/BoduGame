"use client";
import { useEffect, useState, useEffectEvent } from "react";
import { GameDialog } from "@/components/GameDialog";

export function remembersConsent(id: string) {
  try {
    return localStorage.getItem("avalon-real-names:" + id) === "yes";
  } catch {
    return false;
  }
}
export function RealNameConsent({
  id,
  onAccept,
  onClose,
}: {
  id: string;
  onAccept: () => void;
  onClose: () => void;
}) {
  const [remember, setRemember] = useState(false);
  const accept = useEffectEvent(onAccept);
  useEffect(() => {
    if (remembersConsent(id)) accept();
  }, [id]);
  return (
    <GameDialog title="실명 사용 방" onClose={onClose}>
      <p>이 방에서는 참가자에게 내 실명이 표시됩니다.</p>
      <label>
        <input
          type="checkbox"
          checked={remember}
          onChange={(e) => setRemember(e.target.checked)}
        />{" "}
        다음부턴 묻지 않기
      </label>
      <button
        className="button"
        onClick={() => {
          if (remember) {
            try {
              localStorage.setItem("avalon-real-names:" + id, "yes");
            } catch {}
          }
          onAccept();
        }}
      >
        확인
      </button>
    </GameDialog>
  );
}

export function RoomConsent({
  id,
  accept,
}: {
  id: string;
  accept: () => Promise<void>;
}) {
  const [open, setOpen] = useState(true);
  return open ? (
    <RealNameConsent
      id={id}
      onClose={() => setOpen(false)}
      onAccept={() => {
        setOpen(false);
        void accept();
      }}
    />
  ) : (
    <button onClick={() => setOpen(true)}>실명 사용 확인</button>
  );
}
