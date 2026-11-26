"use client";

import ConfirmModal from "@/components/ConfirmModal";
import { useDiceArena } from "../hooks/useDiceArena";
import GoldCardDrawModal from "../gold-cards/components/GoldCardDrawModal";
import BoardgameHeader from "./BoardgameHeader";
import ArenaViewport from "./ArenaViewport";
import DiceArenaSidebar from "./DiceArenaSidebar";

export default function DiceArena({ role }: { role: string | null }) {
  const { header, viewport, sidebar, card, restart, drawings, setDrawings } = useDiceArena();
  const size = viewport.isFullscreen
    ? "fixed inset-0 z-50 h-screen rounded-none"
    : "h-420 rounded-3xl lg:h-180";

  return (
    <>
      <BoardgameHeader {...header} role={role} />
      {header.activeBoardgameId ? (
        <div
          className={`flex w-full flex-col overflow-hidden border border-slate-800 bg-slate-950 shadow-2xl select-none lg:flex-row ${size}`}
        >
          <ArenaViewport {...viewport}>
            {card && <GoldCardDrawModal {...card} />}
          </ArenaViewport>
          <DiceArenaSidebar boardId={header.activeBoardgameId} props={sidebar} drawings={drawings} setDrawings={setDrawings} />
        </div>
      ) : (
        viewport.status && <p role="status">{viewport.status}</p>
      )}
      {restart && (
        <ConfirmModal
          message="게임을 처음부터 다시 시작할까요?"
          warning="팀 위치, 현재 턴, 주사위 결과가 초기화됩니다. 팀 이름은 유지됩니다."
          {...restart}
        />
      )}
    </>
  );
}
