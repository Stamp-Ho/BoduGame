import { useState } from "react";
import { ArrowLeftRight, Crown, ShieldHalf } from "lucide-react";
import { type View, cardName } from "./room-ui";
import { GoldSword } from "./PlayerPieces";

export function GameHistory({ view }: { view: View }) {
  const [mode, setMode] = useState<"category" | "timeline">("timeline");
  const nameOf = (id: string) =>
    view.players.find((player) => player.id === id)?.name ?? "알 수 없음";
  const visibleEventIndices = new Set(
    view.publicEvents.flatMap((event, index) => {
      const quest = /^(\d+)차 원정 (?:성공|실패)(?:\s|$)/.exec(event);
      if (
        quest &&
        view.results.some((result) => result.number === Number(quest[1]))
      )
        return [];
      const rejectedVote = /^(\d+)차 팀 투표 부결/.exec(event);
      if (
        rejectedVote &&
        view.voteHistory.some(
          (vote) => vote.mission === Number(rejectedVote[1]) && !vote.approved,
        )
      )
        return [];
      return [index];
    }),
  );
  const voteCard = (index: number) => {
    const vote = view.voteHistory[index];
    if (!vote) return null;
    return (
      <article
        key={`vote-${index}`}
        className="rounded-xl bg-slate-100 p-3 text-sm"
      >
        <p className="font-semibold">
          {vote.mission}차 원정 · 투표{" "}
          <span className={vote.approved ? "text-blue-700" : "text-red-600"}>
            {vote.approved ? "승인" : "부결"}
          </span>
        </p>
        <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {view.players.map((player) => (
            <span
              key={player.id}
              className="flex min-w-0 items-center gap-1.5 rounded-lg bg-white px-2 py-1.5"
            >
              {vote.leaderId === player.id ? (
                <Crown
                  aria-label="리더"
                  className="size-4 shrink-0 text-red-600"
                />
              ) : vote.excaliburHolder === player.id ? (
                <GoldSword className="size-4 shrink-0" />
              ) : vote.team.includes(player.id) ? (
                <ShieldHalf
                  aria-label="제안된 원정대"
                  className="size-4 shrink-0 fill-amber-100 text-amber-700"
                />
              ) : (
                <span className="w-4" />
              )}
              <span
                className={`truncate ${vote.team.includes(player.id) ? "text-amber-700 font-bold" : "text-slate-800"}`}
              >
                {player.name}
              </span>
              <span
                aria-hidden="true"
                className={`size-3.5 shrink-0 rounded-full border border-slate-700 ml-1 ${vote.votes[player.id] ? "bg-white" : "bg-slate-900"}`}
              />
              <span className="text-xs text-slate-500">
                {vote.votes[player.id] ? "찬성" : "반대"}
              </span>
            </span>
          ))}
        </div>
      </article>
    );
  };
  const questCard = (index: number) => {
    const result = view.results[index];
    if (!result) return null;
    return (
      <article
        key={`quest-${index}`}
        className={`rounded-xl border p-3 text-sm ${result.success ? "border-blue-200 bg-blue-50" : "border-red-200 bg-red-50"}`}
      >
        <p className="font-semibold">
          {result.number}차 원정 ·{" "}
          <span className={result.success ? "text-blue-700" : "text-red-600"}>
            {result.success ? "성공" : "실패"}
          </span>
        </p>
        <div
          aria-label="원정대 멤버와 리더"
          className="mt-2 flex flex-wrap gap-1.5"
        >
          {result.team.map((id) => (
            <span
              key={id}
              className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-slate-700"
            >
              {result.leaderId === id && (
                <Crown
                  aria-label="리더"
                  className="size-4 shrink-0 text-red-600"
                />
              )}
              {result.excaliburHolder === id && (
                <GoldSword className="size-4 shrink-0" />
              )}
              {nameOf(id)}
              {result.excaliburTarget === id && (
                <ArrowLeftRight
                  aria-label="엑스칼리버로 카드 변경됨"
                  className="size-4 shrink-0 text-red-600"
                />
              )}
            </span>
          ))}
          {result.leaderId && !result.team.includes(result.leaderId) && (
            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-slate-700">
              <Crown
                aria-label="리더"
                className="size-4 shrink-0 text-red-600"
              />
              {nameOf(result.leaderId)}
            </span>
          )}
        </div>
        <p className="mt-2 text-slate-500">
          공개된 원정 카드:{" "}
          {result.cards.map((card) => cardName[card]).join(" · ") || "없음"}
        </p>
        <p className="mt-1 text-slate-500">실패 {result.failCount}개</p>
      </article>
    );
  };
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold">진행 기록</h2>
        <div
          role="group"
          aria-label="기록 보기 방식"
          className="inline-flex rounded-lg border border-slate-300 p-0.5 text-xs font-medium"
        >
          <button
            type="button"
            aria-pressed={mode === "category"}
            onClick={() => setMode("category")}
            className={`rounded-md px-2.5 py-1.5 ${mode === "category" ? "bg-violet-700 text-white" : "text-slate-500"}`}
          >
            카테고리별
          </button>
          <button
            type="button"
            aria-pressed={mode === "timeline"}
            onClick={() => setMode("timeline")}
            className={`rounded-md px-2.5 py-1.5 ${mode === "timeline" ? "bg-violet-700 text-white" : "text-slate-500"}`}
          >
            시간순서
          </button>
        </div>
      </div>
      {mode === "category" ? (
        <>
          {view.voteHistory.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">투표 내역</h3>
              <div className="mt-2 space-y-2">
                {view.voteHistory
                  .map((_, index) => index)
                  .reverse()
                  .map(voteCard)}
              </div>
            </div>
          )}
          {view.results.length > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">원정 내역</h3>
              <div className="mt-2 space-y-2">
                {view.results
                  .map((_, index) => index)
                  .reverse()
                  .map(questCard)}
              </div>
            </div>
          )}
          {visibleEventIndices.size > 0 && (
            <div className="mt-4">
              <h3 className="text-sm font-semibold">기타 기록</h3>
              <ol className="mt-2 space-y-1 text-sm text-slate-500">
                {[...visibleEventIndices].reverse().map((index) => (
                  <li key={index}>• {view.publicEvents[index]}</li>
                ))}
              </ol>
            </div>
          )}
        </>
      ) : (
        <>
          {view.historyApproximate && (
            <p className="mt-3 text-xs text-amber-700">
              이 방의 이전 기록은 저장된 내역을 기준으로 순서를 복원했습니다.
            </p>
          )}
          <div className="mt-3 space-y-2">
            {view.history
              .slice()
              .reverse()
              .filter(
                (entry) =>
                  entry.type !== "event" ||
                  visibleEventIndices.has(entry.index),
              )
              .map((entry, position) =>
                entry.type === "vote" ? (
                  voteCard(entry.index)
                ) : entry.type === "quest" ? (
                  questCard(entry.index)
                ) : (
                  <article
                    key={`event-${position}`}
                    className="rounded-xl bg-slate-100 p-3 text-sm text-slate-500"
                  >
                    {view.publicEvents[entry.index]}
                  </article>
                ),
              )}
          </div>
        </>
      )}
    </section>
  );
}
