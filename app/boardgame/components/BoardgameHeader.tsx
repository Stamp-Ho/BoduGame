"use client";

import { useState } from "react";
import { Dices, PlusCircle, UsersRound } from "lucide-react";
import type { BoardgameSummary, CreatedBoard } from "../types/session";
import BoardgameCreateModal from "./BoardgameCreateModal";
import BoardgameEditorAccessModal from "./BoardgameEditorAccessModal";
import BoardgamePicker from "./BoardgamePicker";
import ConfirmModal from "@/components/ConfirmModal";

type Props = {
  boardgames: BoardgameSummary[];
  activeBoardgameId: string | null;
  role: string | null;
  isBusy: boolean;
  onSelect: (id: string | null) => void;
  onCreated: (game: CreatedBoard) => void;
  refresh: () => Promise<void>;
  onDeleteBoardgame: () => Promise<void>;
};

const action =
  "inline-flex items-center gap-2 rounded-[.65rem] px-4 py-2.5 text-sm font-semibold disabled:opacity-50";
const userLimit = 2;

export default function BoardgameHeader({
  boardgames,
  activeBoardgameId,
  role,
  isBusy,
  onSelect,
  onCreated,
  refresh,
  onDeleteBoardgame,
}: Props) {
  const [dialog, setDialog] = useState<"create" | "share" | "delete" | null>(
    null,
  );
  const selected = boardgames.find((board) => board.id === activeBoardgameId);
  const ownedCount = boardgames.filter((board) => board.is_owner).length;
  const limited = role === "user";
  const atLimit = limited && ownedCount >= userLimit;
  const close = () => setDialog(null);

  return (
    <>
      <header className="flex flex-wrap items-center justify-between gap-5 border-0 pb-2 mb-3 pt-2">
        <span className="flex items-center gap-2 font-bold text-2xl text-transparent bg-clip-text bg-linear-to-r from-blue-400 to-indigo-400">
          <Dices className="h-9 w-9 text-sky-500" /> 주루마블
        </span>
        <div className="flex flex-wrap items-center gap-2">
          {activeBoardgameId ? (
            <button
              type="button"
              className={
                action +
                " bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
              }
              onClick={() => onSelect(null)}
            >
              목록
            </button>
          ) : (
            role && (
              <button
                type="button"
                className={
                  action +
                  " bg-linear-to-r from-blue-600 to-indigo-600 text-white hover:from-blue-500 hover:to-indigo-500"
                }
                disabled={isBusy || atLimit}
                onClick={() => setDialog("create")}
              >
                <PlusCircle size={16} /> 새 주루마블 생성{" "}
                {limited && (
                  <span>
                    ({ownedCount}/{userLimit})
                  </span>
                )}
              </button>
            )
          )}
          {selected?.can_manage && (
            <>
              <button
                type="button"
                className={
                  action +
                  " border border-[#334155] bg-[#0f172a] text-indigo-300 hover:bg-[#1e293b]"
                }
                disabled={isBusy}
                onClick={() => setDialog("share")}
              >
                <UsersRound size={16} /> 공유 관리
              </button>
              <button
                type="button"
                className={
                  action +
                  " border border-[#334155] bg-[#0f172a] text-indigo-300 hover:bg-[#1e293b]"
                }
                disabled={isBusy}
                onClick={() => setDialog("delete")}
              >
                주루마블 삭제
              </button>
            </>
          )}
        </div>
      </header>
      {activeBoardgameId ? null : (
        <BoardgamePicker
          boards={boardgames}
          selectedId={activeBoardgameId}
          busy={isBusy}
          onSelect={onSelect}
        />
      )}
      {dialog === "create" && (
        <BoardgameCreateModal onClose={close} onCreated={onCreated} />
      )}
      {dialog === "share" && selected?.can_manage && (
        <BoardgameEditorAccessModal
          board={selected}
          refresh={refresh}
          onClose={close}
        />
      )}
      {dialog === "delete" && selected?.can_manage && (
        <ConfirmModal
          message={`주루마블 ‘${selected.name}’을 삭제할까요?`}
          warning="삭제하면 되돌릴 수 없습니다."
          onConfirm={() => {
            close();
            void onDeleteBoardgame();
          }}
          onCancel={close}
        />
      )}
    </>
  );
}
