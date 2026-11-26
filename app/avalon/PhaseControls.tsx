import { Swords } from "lucide-react";
import { type PlotCard } from "./rules";
import { type Move } from "./engine";
import {
  type View,
  type User,
  type AssassinationKind,
  cardName,
  visibleQuestCards,
  questCardToSubmit,
  plotName,
  field,
  primary,
  secondary,
} from "./room-ui";

export function PhaseControls({
  view,
  user,
  busy,
  send,
  onReturnToRooms,
  target,
  setTarget,
  secondTarget,
  setSecondTarget,
  assassinationKind,
  setAssassinationKind,
  plotCardChoice,
  setPlotCardChoice,
}: {
  view: View;
  user: User;
  busy: boolean;
  send: (move: Move, onSuccess?: () => void | Promise<void>) => Promise<void>;
  onReturnToRooms: () => void | Promise<void>;
  target: string;
  setTarget: (id: string) => void;
  secondTarget: string;
  setSecondTarget: (id: string) => void;
  assassinationKind: AssassinationKind;
  setAssassinationKind: (kind: AssassinationKind) => void;
  plotCardChoice: PlotCard | "";
  setPlotCardChoice: (card: PlotCard | "") => void;
}) {
  const me = view.players.find((p) => p.id === user.id);
  const isLeader = me?.seat === view.leaderSeat;
  const selectedName = view.players.find((p) => p.id === target)?.name;

  if (view.phase === "reveal")
    return (
      <>
        <h2 className="font-bold">역할 확인</h2>
        <p className="mt-2 text-sm text-slate-500">
          개인 정보를 확인한 뒤 준비해 주세요.{" "}
          {view.players.filter((p) => p.seen).length}/{view.players.length}명
          확인
        </p>
        <button
          className={`${primary} mt-4 w-full`}
          disabled={busy || me?.seen}
          onClick={() => void send({ type: "seen" })}
        >
          {me?.seen ? "확인 완료" : "역할 확인 완료"}
        </button>
      </>
    );
  if (view.phase === "loyalty_check")
    return (
      <>
        <h2 className="font-bold">진영 조사 응답</h2>
        {view.pendingCheck?.target === user.id ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              사기꾼은 조사 결과를 선 또는 악으로 선택할 수 있습니다. 실제
              진영은 바뀌지 않습니다.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                className={primary}
                disabled={busy}
                onClick={() =>
                  void send({ type: "loyalty_reply", side: "good" })
                }
              >
                선으로 응답
              </button>
              <button
                className={secondary}
                disabled={busy}
                onClick={() =>
                  void send({ type: "loyalty_reply", side: "evil" })
                }
              >
                악으로 응답
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            진영 조사 응답을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "plot_lead")
    return (
      <>
        <h2 className="font-bold">Lead to Victory</h2>
        {view.plotOpportunity[0] === user.id ? (
          <div className="mt-3 flex gap-2">
            <button
              className={primary}
              disabled={busy}
              onClick={() =>
                void send({
                  type: "plot_use",
                  card: "lead_to_victory",
                  target: "use",
                })
              }
            >
              리더가 되기
            </button>
            <button
              className={secondary}
              disabled={busy}
              onClick={() =>
                void send({ type: "plot_use", card: "lead_to_victory" })
              }
            >
              넘기기
            </button>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            카드 보유자의 결정을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "plot_distribute")
    return (
      <>
        <h2 className="font-bold">플롯 카드 배분</h2>
        <p className="mt-2 text-sm text-slate-500">
          다음 카드: {plotName[view.plotDrawn[0]]}
        </p>
        {isLeader ? (
          <>
            <p className="mt-3 text-sm text-violet-700">
              카드를 받을 참가자: {selectedName ?? "위에서 선택"}
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={busy || !target}
              onClick={() => void send({ type: "plot_give", holder: target })}
            >
              카드 전달
            </button>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            리더가 카드를 배분하고 있습니다.
          </p>
        )}
      </>
    );
  if (view.phase === "plot_immediate") {
    const pending = view.plotPending;
    if (!pending) return null;
    const acting =
      pending.card === "show_your_strength"
        ? isLeader
        : pending.holder === user.id;
    const otherHands = target ? (view.plotHands[target] ?? []) : [];
    return (
      <>
        <h2 className="font-bold">{plotName[pending.card]}</h2>
        {acting ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              {pending.card === "restore_your_honor"
                ? "다른 사람의 플롯 카드를 가져옵니다."
                : "진영을 확인하거나 보여줄 대상을 선택합니다."}
            </p>
            <p className="mt-3 text-sm text-violet-700"></p>
            {pending.card === "restore_your_honor" && (
              <select
                className={`${field} mt-2 w-full`}
                value={plotCardChoice}
                onChange={(e) => setPlotCardChoice(e.target.value as PlotCard)}
              >
                <option value="">가져올 카드</option>
                {otherHands.map((card, i) => (
                  <option key={`${card}-${i}`} value={card}>
                    {plotName[card]}
                  </option>
                ))}
              </select>
            )}
            <button
              className={`${primary} mt-3 w-full`}
              disabled={
                busy ||
                !target ||
                (pending.card === "restore_your_honor" && !plotCardChoice)
              }
              onClick={() =>
                void send({
                  type: "plot_apply",
                  target,
                  card: plotCardChoice || undefined,
                })
              }
            >
              효과 적용
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            카드 효과 처리를 기다립니다.
          </p>
        )}
      </>
    );
  }
  if (["plot_king", "plot_forced", "plot_ambush"].includes(view.phase)) {
    const card: PlotCard =
      view.phase === "plot_king"
        ? "king_returns"
        : view.phase === "plot_forced"
          ? "we_found_you"
          : "ambush";
    return (
      <>
        <h2 className="font-bold">{plotName[card]}</h2>
        {view.plotOpportunity[0] === user.id ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              카드를 사용하거나 넘길 수 있습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className={primary}
                disabled={busy || (card !== "king_returns" && !target)}
                onClick={() =>
                  void send({
                    type: "plot_use",
                    card,
                    target: card === "king_returns" ? "use" : target,
                  })
                }
              >
                사용
              </button>
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void send({ type: "plot_use", card })}
              >
                넘기기
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            카드 보유자의 결정을 기다립니다.
          </p>
        )}
      </>
    );
  }
  if (view.phase === "vote")
    return (
      <>
        <h2 className="font-bold">팀 승인 투표</h2>
        <p className="mt-2 text-sm text-slate-500">
          {view.voteCount}/{view.players.length}명 제출 · 모두 제출하면 투표
          내용이 공개됩니다.
        </p>
        {!view.voted ? (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <button
              className={primary}
              disabled={busy}
              onClick={() => void send({ type: "vote", approve: true })}
            >
              찬성
            </button>
            <button
              className={secondary}
              disabled={busy}
              onClick={() => void send({ type: "vote", approve: false })}
            >
              반대
            </button>
          </div>
        ) : (
          <p className="mt-4 text-sm text-violet-700">
            투표 완료. 다른 참가자를 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "excalibur_assign")
    return (
      <>
        <h2 className="font-bold">엑스칼리버 수여</h2>
        {isLeader ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              확정된 원정 팀원 한 명에게 엑스칼리버를 주거나 사용하지 않을 수
              있습니다. 리더 본인은 받을 수 없습니다.
            </p>
            <p className="mt-3 text-sm text-violet-700">
              받을 팀원: {selectedName ?? "위에서 선택"}
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className={primary}
                disabled={busy || !target}
                onClick={() =>
                  void send({ type: "excalibur_give", holder: target })
                }
              >
                엑스칼리버 주기
              </button>
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void send({ type: "excalibur_give" })}
              >
                사용 안 함
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            리더의 엑스칼리버 결정을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "quest")
    return (
      <>
        <h2 className="flex items-center gap-2 font-bold">
          <Swords size={18} /> 원정 카드
        </h2>
        <p className="mt-2 text-sm text-slate-500">
          {view.cardCount}/{view.proposal.length}명 제출 · 두 번째 카드는 직업에
          따라 실패 또는 마법으로 적용됩니다. 불가능한 선택지는 자동으로
          바뀝니다.
        </p>
        {view.publicQuestCard && (
          <p className="mt-2 rounded-lg bg-amber-50 p-2 text-sm text-amber-800">
            공개 카드:{" "}
            {view.players.find((p) => p.id === view.forcedPublicCard)?.name} ·{" "}
            {cardName[view.publicQuestCard]}
          </p>
        )}
        {view.proposal.includes(user.id) ? (
          view.cardSubmitted ? (
            <p className="mt-4 text-violet-700">
              카드 제출 완료. 다른 팀원을 기다립니다.
            </p>
          ) : (
            <>
              <div className="mt-4 grid grid-cols-2 gap-2">
                {visibleQuestCards(view.config).map((card) => (
                  <button
                    key={card}
                    className={
                      card === "success"
                        ? "rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                        : card === "fail"
                          ? "rounded-xl bg-red-600 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"
                          : primary
                    }
                    disabled={busy}
                    onClick={() => {
                      const submittedCard = questCardToSubmit(
                        card,
                        view.myAllowedCards,
                      );
                      if (submittedCard)
                        void send({ type: "quest", card: submittedCard });
                    }}
                  >
                    {card === "fail" ? "실패 혹은 마법" : cardName[card]}
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          <p className="mt-4 text-sm text-slate-500">
            원정 팀의 카드 제출을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "excalibur")
    return (
      <>
        <h2 className="font-bold">엑스칼리버</h2>
        {view.excaliburHolder === user.id ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              다른 팀원의 카드를 바꾸거나 사용하지 않을 수 있습니다.
            </p>
            <div className="mt-3 flex gap-2">
              <button
                className={primary}
                disabled={busy || !target}
                onClick={() => void send({ type: "excalibur", target })}
              >
                카드 바꾸기
              </button>
              <button
                className={secondary}
                disabled={busy}
                onClick={() => void send({ type: "excalibur" })}
              >
                사용 안 함
              </button>
            </div>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            엑스칼리버 소유자의 선택을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "trapper")
    return (
      <>
        <h2 className="font-bold">함정꾼</h2>
        {isLeader ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              원정 카드 한 장을 확인하고 판정에서 제외합니다.
            </p>
            <p className="mt-3 text-sm text-violet-700">
              제외할 팀원: {selectedName ?? "위에서 선택"}
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={busy || !target}
              onClick={() => void send({ type: "trapper", target })}
            >
              카드 제외
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            리더의 선택을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "gawain_check")
    return (
      <>
        <h2 className="font-bold">가웨인의 원정 카드 확인</h2>
        <p className="mt-2 text-sm text-slate-500">
          {view.mission}차 원정 {view.results.at(-1)?.success ? "성공" : "실패"}{" "}
          · 제출 카드가 공개되었습니다.
        </p>
        {view.myRole.includes("gawain") ? (
          <>
            <p className="mt-3 text-sm text-slate-500">
              이번 원정에 참가하지 않았으므로 팀원 한 명의 내지 않은 카드를
              확인할 수 있습니다. 성공 카드를 제출했다면 추방됩니다.
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={
                busy || !selectedName || !view.proposal.includes(target)
              }
              onClick={() => void send({ type: "gawain_check", target })}
            >{`[ ${selectedName ?? "대상 선택"} ] 카드 확인`}</button>
            <p className="mt-2 text-xs text-slate-500">
              확인 결과는 내 정보에서 볼 수 있습니다.
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm text-slate-500">
            가웨인의 확인을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "lady")
    return (
      <>
        <h2 className="font-bold">호수의 여인</h2>
        {view.ladyHolder === user.id ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              한 사람을 선택해 현재 진영을 비밀리에 확인합니다.
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={
                busy ||
                !selectedName ||
                target === user.id ||
                view.ladyUsed.includes(target)
              }
              onClick={() => void send({ type: "lady", target })}
            >
              {selectedName ? `[ ${selectedName} ] ` : ""}진영 확인
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            호수의 여인 보유자가 조사 중입니다.
          </p>
        )}
      </>
    );
  if (view.phase === "recruit")
    return (
      <>
        <h2 className="font-bold">불신의 충신 모집</h2>
        {view.myRole.includes("assassin") ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              암살자가 불신의 충신을 한 번 추측합니다.
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={busy || !target}
              onClick={() => void send({ type: "recruit", target })}
            >
              모집 시도
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            암살자의 선택을 기다립니다.
          </p>
        )}
      </>
    );
  if (view.phase === "assassinate") {
    const modes: { kind: AssassinationKind; label: string; confirm: string }[] =
      [
        { kind: "merlin", label: "멀린 1명", confirm: "멀린 암살 확정" },
        ...(view.config.evilSlots.some((slot) =>
          slot.includes("evil_messenger"),
        )
          ? [
              {
                kind: "messengers" as const,
                label: "선 전령 2명",
                confirm: "전령 암살 확정",
              },
            ]
          : []),
        ...(view.config.goodSlots.some((slot) => slot.includes("tristan"))
          ? [
              {
                kind: "lovers" as const,
                label: "연인 2명",
                confirm: "연인 암살 확정",
              },
            ]
          : []),
      ];
    const twoTargets = assassinationKind !== "merlin";
    const first = view.players.find((player) => player.id === target);
    const second = view.players.find((player) => player.id === secondTarget);
    const readyToAssassinate =
      first?.side === "good" &&
      (!twoTargets || (second?.side === "good" && second.id !== first.id));
    return (
      <>
        <h2 className="font-bold">마지막 암살</h2>
        {(
          view.recruited
            ? view.recruited === user.id
            : view.myRole.includes("assassin")
        ) ? (
          <>
            <p className="mt-2 text-sm text-slate-500">
              암살 방식을 고른 뒤 위 참가자 카드에서 선 진영 대상{" "}
              {twoTargets ? "두 명" : "한 명"}을 선택하세요. 직업은 공개되지
              않습니다.
            </p>
            <div
              role="group"
              aria-label="암살 방식"
              className="mt-3 flex flex-wrap gap-2"
            >
              {modes.map((mode) => (
                <button
                  key={mode.kind}
                  type="button"
                  aria-pressed={assassinationKind === mode.kind}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-violet-600 ${assassinationKind === mode.kind ? "border-violet-700 bg-violet-700 text-white" : "border-violet-200 bg-violet-50 text-violet-800"}`}
                  onClick={() => {
                    setAssassinationKind(mode.kind);
                    setTarget("");
                    setSecondTarget("");
                  }}
                >
                  {mode.label}
                </button>
              ))}
            </div>
            <p className="mt-3 text-sm text-violet-800">
              선택한 대상{" "}
              {Number(Boolean(first)) + Number(twoTargets && Boolean(second))}/
              {twoTargets ? 2 : 1}: {first?.name ?? "미선택"}
              {twoTargets && ` · ${second?.name ?? "미선택"}`}
            </p>
            <button
              className={`${primary} mt-3 w-full`}
              disabled={busy || !readyToAssassinate}
              onClick={() =>
                void send({
                  type: "assassinate",
                  target,
                  targetType: assassinationKind,
                  secondTarget: twoTargets ? secondTarget : undefined,
                })
              }
            >
              {modes.find((mode) => mode.kind === assassinationKind)?.confirm ??
                "암살 확정"}
            </button>
          </>
        ) : (
          <p className="mt-2 text-sm text-slate-500">
            악 진영의 마지막 선택을 기다립니다.
          </p>
        )}
      </>
    );
  }
  if (view.phase === "best_player_vote") {
    const candidates = view.players.filter(
      (player) => player.side === view.winner,
    );
    return (
      <>
        <h2 className="text-lg font-bold">
          {view.winner === "good" ? "선 진영 승리" : "악 진영 승리"}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{view.winReason}</p>
        <p className="mt-3 text-sm text-slate-500">
          승리 플레이어 중 한 명에게 투표해 주세요. {view.bestPlayerVoteCount}/
          {view.players.length}명 응답
        </p>
        {view.bestPlayerVoted ? (
          <p
            role="status"
            className="mt-4 rounded-xl bg-violet-50 p-3 text-sm font-semibold text-violet-800"
          >
            투표를 마쳤습니다. 다른 참가자의 응답을 기다리는 중입니다.
          </p>
        ) : (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {candidates.map((player) => (
              <button
                key={player.id}
                type="button"
                className={secondary}
                disabled={busy}
                onClick={() =>
                  void send({ type: "best_player_vote", target: player.id })
                }
              >
                {player.name}에게 투표
              </button>
            ))}
          </div>
        )}
        {
          <button
            type="button"
            className="mt-2 w-full rounded-xl px-4 py-3 text-sm font-medium text-slate-500 hover:bg-slate-100 disabled:opacity-40"
            disabled={busy}
            onClick={() =>
              view.bestPlayerVoted
                ? void onReturnToRooms()
                : void send({ type: "best_player_vote" }, onReturnToRooms)
            }
          >
            중단 후 대기실로 돌아가기{view.bestPlayerVoted ? "" : " (무투표)"}
          </button>
        }
      </>
    );
  }
  if (view.phase === "finished") {
    const counts = Object.values(view.bestPlayerVotes).reduce<
      Record<string, number>
    >((result, playerId) => {
      if (playerId) result[playerId] = (result[playerId] ?? 0) + 1;
      return result;
    }, {});
    const highScore = Math.max(0, ...Object.values(counts));
    const bestPlayers = view.players.filter(
      (player) => counts[player.id] === highScore && highScore > 0,
    );
    return (
      <>
        <h2 className="text-xl font-bold">
          {view.winner === "good" ? "선 진영 승리" : "악 진영 승리"}
        </h2>
        <p className="mt-2 text-sm text-slate-500">{view.winReason}</p>
        <div className="mt-4 rounded-xl bg-amber-50 p-4">
          <h3 className="font-bold text-amber-950">
            베스트 플레이어 투표 결과
          </h3>
          {bestPlayers.length ? (
            <p className="mt-1 text-sm text-amber-900">
              {bestPlayers
                .map((player) => `${player.name} ${counts[player.id]}표`)
                .join(" · ")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-amber-900">
              베스트 플레이어 투표가 없습니다.
            </p>
          )}
        </div>
      </>
    );
  }
  return null;
}
