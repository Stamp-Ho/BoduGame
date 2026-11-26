import { useState } from "react";
import type { BoardgameSummary } from "../types/session";

const filters = [
  { id: "all", label: "전체" },
  { id: "private", label: "비공개" },
  { id: "owned", label: "내가 만든 게임" },
] as const;
type Filter = (typeof filters)[number]["id"];

type Props = {
  boards: BoardgameSummary[];
  selectedId: string | null;
  busy: boolean;
  onSelect: (id: string) => void;
};

export default function BoardgamePicker({
  boards,
  selectedId,
  busy,
  onSelect,
}: Props) {
  const [filter, setFilter] = useState<Filter>("all");
  const visible = boards.filter(
    (board) =>
      filter === "all" ||
      (filter === "private" && !board.is_public) ||
      (filter === "owned" && board.is_owner),
  );

  return (
    <>
      <div
        role="group"
        aria-label="주루마블 목록 필터"
        className="flex flex-wrap gap-2 mb-3"
      >
        {filters.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            aria-pressed={filter === id}
            onClick={() => setFilter(id)}
            className="rounded-full border border-slate-700/50 bg-slate-800/60 px-3 py-1.5 text-sm font-semibold text-[#94a3b8] aria-pressed:border-transparent aria-pressed:bg-linear-to-r aria-pressed:from-blue-600 aria-pressed:to-indigo-600 aria-pressed:text-white hover:border-indigo-500/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400"
          >
            {label}
          </button>
        ))}
      </div>
      <nav
        aria-label="주루마블 선택"
        className="m-0 flex w-full flex-wrap items-center gap-3 rounded-2xl border border-slate-700/50 bg-slate-800/60 p-2 md:p-3"
      >
        {visible.map((board) => (
          <button
            key={board.id}
            type="button"
            disabled={busy}
            aria-pressed={selectedId === board.id}
            onClick={() => onSelect(board.id)}
            className="whitespace-nowrap rounded-xl border border-slate-700/50 bg-slate-900/60 px-3 pt-1.5 pb-2 text-indigo-300 text-sm font-semibold aria-pressed:border-transparent aria-pressed:bg-linear-to-r aria-pressed:from-blue-600 aria-pressed:to-indigo-600 aria-pressed:text-white hover:border-indigo-500/50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-400 disabled:opacity-50"
          >
            {board.name}
          </button>
        ))}
        {!busy && !visible.length && (
          <p className="py-2 text-sm text-[#94a3b8]">
            표시할 주루마블이 없습니다.
          </p>
        )}
      </nav>
    </>
  );
}
