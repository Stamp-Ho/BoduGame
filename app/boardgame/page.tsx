import { Suspense } from "react";
import { currentPlayer } from "@/server/auth/session";
import BoardGameMain from "./BoardGameMain";

export const metadata = {title:"주루마블"};
async function Arena() {
  const player = await currentPlayer();
  return <BoardGameMain key={player?.id ?? "guest"} role={player?.role ?? null}/>;
}
export default function BoardgamePage() {
  return <Suspense fallback={<p>주루마블을 불러오는 중…</p>}><Arena/></Suspense>;
}
