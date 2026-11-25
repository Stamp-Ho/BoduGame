import { Suspense } from "react";
import { currentPlayer } from "@/server/auth/session";
import AvalonMain from "./AvalonMain";
export const metadata = { title: "아발론" };
async function LobbyPage() {
  const p = await currentPlayer();
  return (
    <AvalonMain
      key={p?.id ?? "guest"}
      user={{ id: p?.id ?? "", name: p?.nickname ?? "" }}
      role={p?.role}
    />
  );
}
export default function AvalonPage() {
  return (
    <Suspense fallback={<p>아발론 대기실을 불러오는 중…</p>}>
      <LobbyPage />
    </Suspense>
  );
}
