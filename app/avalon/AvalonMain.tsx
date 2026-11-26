"use client";
import { startTransition, useEffect, useRef, useState } from "react";
import {
  ArrowLeftRight,
  BookOpen,
  Check,
  Crown,
  Eye,
  EyeOff,
  ShieldHalf,
  Skull,
  X,
} from "lucide-react";
import { useRoomNotifications } from "./useRoomNotifications";
import { useAvalonEvents } from "./useAvalonEvents";
import { Lobby } from "./Lobby";
import { LobbySettings } from "./LobbySettings";
import { RoomConsent } from "./RealNameConsent";
import { dissolveAvalonRoom, finishAvalonVote } from "./admin";
import { leaveAvalonRoom, moveAvalonRoom } from "./moves";
import {
  createAvalonRoom,
  getAvalonRoom,
  getMyAvalonRoom,
  joinAvalonRoom,
  listAvalonRooms,
} from "./actions";
import { type AvalonRoomSummary } from "./types";
import {
  REJECTED_VOTE_REVEAL_MS,
  ROLES,
  TEAM_COUNTS,
  validateConfig,
  type Config,
  type PlotCard,
} from "./rules";
import { type Move } from "./engine";
import { useLocalNotes } from "./useLocalNotes";
import RulebookModal, { getPendingAvalonAction } from "./RulebookModal";
import LadyIcon from "./LadyIcon";
import TeamAssignmentModal from "./TeamAssignmentModal";
import HistoryRankingModal from "./HistoryRankingModal";
import {
  type View,
  type User,
  type AssassinationKind,
  cardName,
  gawainPeekLabel,
  plotName,
  field,
  primary,
  secondary,
  showGameNotification,
} from "./room-ui";
import {
  PlayerAvatar,
  PlayerNote,
  ExcaliburSword,
  RejectionTrack,
} from "./PlayerPieces";
import { GameHistory } from "./GameHistory";
import { RoleComposition } from "./RoleComposition";
import { ConfigEditor } from "./ConfigEditor";
import { PhaseControls } from "./PhaseControls";

export default function AvalonMain({
  user,
  role = "",
  preview,
}: {
  user: User;
  role?: string;
  preview?: View;
}) {
  const [roomId, setRoomId] = useState(preview ? "preview" : "");
  const [rooms, setRooms] = useState<AvalonRoomSummary[]>([]);
  const [statsOpen, setStatsOpen] = useState(false);
  const configDirty = useRef(false);
  const [view, setView] = useState<View | null>(preview ?? null);
  const [config, setConfig] = useState<Config | null>(preview?.config ?? null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const seenActionTurns = useRef(new Set<string>());
  const { notificationFeedback, enableGameNotification } = useRoomNotifications(
    roomId,
    view,
  );
  const [team, setTeam] = useState<string[]>([]);
  const [missionChoice, setMissionChoice] = useState(1);
  const [watchHolder, setWatchHolder] = useState("");
  const [proposalPick, setProposalPick] = useState<"team" | "watch">("team");
  const [target, setTarget] = useState("");
  const [secondTarget, setSecondTarget] = useState("");
  const [assassinationKind, setAssassinationKind] =
    useState<AssassinationKind>("merlin");
  const [plotCardChoice, setPlotCardChoice] = useState<PlotCard | "">("");
  const {
    notes,
    updateNote,
    ready: notesReady,
  } = useLocalNotes(roomId, view?.phase);
  const [showSecret, setShowSecret] = useState(false);
  const [rulebookOpen, setRulebookOpen] = useState(false);
  const [compositionOpen, setCompositionOpen] = useState(false);
  const [teamAssignmentOpen, setTeamAssignmentOpen] = useState(false);
  const [completionReadyFor, setCompletionReadyFor] = useState("");
  const [rejectionRevealExpiredFor, setRejectionRevealExpiredFor] =
    useState("");
  const [reminderTurnKey, setReminderTurnKey] = useState<string | null>(null);
  const phaseStartedAt = view?.phaseStartedAt;
  const rejectedVoteAt = view?.rejectedVoteAt;
  const plotOpportunityActor = view?.plotOpportunity[0];
  const nextPlotCard = view?.plotDrawn[0];
  const pendingPlotCard = view?.plotPending?.card;
  const pendingPlotHolder = view?.plotPending?.holder;
  const completionKey =
    view && (view.phase === "vote" || view.phase === "quest")
      ? `${roomId}:${view.phase}:${phaseStartedAt ?? `${view.mission}:${view.voteHistory.length}:${view.results.length}`}`
      : "";
  const showCompletionChecks = completionReadyFor === completionKey;

  useEffect(() => {
    if (!completionKey) return;
    const startedAt = phaseStartedAt ? Date.parse(phaseStartedAt) : Date.now();
    const delay = Math.max(0, 3000 - (Date.now() - startedAt));
    const timer = setTimeout(() => setCompletionReadyFor(completionKey), delay);
    return () => clearTimeout(timer);
  }, [completionKey, phaseStartedAt]);

  useEffect(() => {
    if (!rejectedVoteAt) return;
    const remaining = Math.max(
      0,
      REJECTED_VOTE_REVEAL_MS - (Date.now() - Date.parse(rejectedVoteAt)),
    );
    const timer = setTimeout(
      () => setRejectionRevealExpiredFor(rejectedVoteAt),
      remaining,
    );
    return () => clearTimeout(timer);
  }, [rejectedVoteAt]);

  async function enter(request: ReturnType<typeof createAvalonRoom>) {
    setBusy(true);
    setError("");
    try {
      const result = await request;
      if (!result.ok) {
        setError(result.error);
        return false;
      }
      configDirty.current = false;
      setShowSecret(false);
      setRoomId(result.data.id);
      setView(result.data.view);
      setConfig(result.data.view.config);
      return true;
    } finally {
      setBusy(false);
    }
  }
  async function create(title: string, priv: boolean, names: boolean) {
    await enter(createAvalonRoom(title, priv, names));
  }
  async function join(id: string | null, code: string | null, accept: boolean) {
    return enter(joinAvalonRoom(id, code, accept));
  }
  async function reload() {
    const r = await getAvalonRoom(roomId);
    if (r.ok) setView(r.data.view);
    else setError(r.error);
  }
  function openStats() {
    setStatsOpen(true);
  }
  async function dissolveRoom(room: AvalonRoomSummary) {
    if (
      !window.confirm(
        `${room.title}님의 대기실을 해산할까요? 참가자 전원이 방에서 나가게 됩니다.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const result = await dissolveAvalonRoom(room.id);
    if (result.ok)
      setRooms((current) => current.filter((item) => item.id !== room.id));
    else setError(result.error);
    setBusy(false);
  }
  async function finishVoteRoom(room: AvalonRoomSummary) {
    if (
      !window.confirm(
        `${room.title}님의 게임 투표를 종료하고 결과를 확정할까요? 아직 제출하지 않은 투표는 미투표로 남습니다.`,
      )
    )
      return;
    setBusy(true);
    setError("");
    const result = await finishAvalonVote(room.id);
    if (result.ok)
      setRooms((current) => current.filter((item) => item.id !== room.id));
    else setError(result.error);
    setBusy(false);
  }
  async function refreshAfterTeamCreation() {
    setBusy(true);
    setError("");
    const [mine, roomList] = await Promise.all([
      getMyAvalonRoom(),
      listAvalonRooms(),
    ]);
    if (roomList.ok) setRooms(roomList.data);
    if (mine.ok && mine.data) {
      configDirty.current = false;
      setRoomId(mine.data.id);
      setView(mine.data.view);
      setConfig(mine.data.view.config);
    } else if (!mine.ok) setError(mine.error);
    setBusy(false);
  }
  async function returnToRooms() {
    setRoomId("");
    setView(null);
    setConfig(null);
    const result = await listAvalonRooms();
    if (result.ok) setRooms(result.data);
  }
  async function send(move: Move, onSuccess?: () => void | Promise<void>) {
    if (preview) {
      setError("미리보기에서는 화면 선택으로 게임 단계를 변경해 주세요.");
      return;
    }
    if (!roomId || busy) return;
    setBusy(true);
    setError("");
    const result = await moveAvalonRoom(roomId, move);
    if (result.ok && result.data.view) {
      setView(result.data.view);
      if (move.type === "config") {
        // 저장 요청 중 추가로 편집한 초안은 서버 응답으로 덮어쓰지 않는다.
        const savedConfig = result.data.view.config;
        setConfig((current) =>
          current && JSON.stringify(current) !== JSON.stringify(move.config)
            ? current
            : savedConfig,
        );
      }
      if (move.type === "stop") {
        configDirty.current = false;
        setConfig(result.data.view.config);
        setShowSecret(false);
      }
      await onSuccess?.();
    } else if (!result.ok) setError(result.error);
    setBusy(false);
  }

  useEffect(() => {
    if (preview) return;
    startTransition(() => {
      void getMyAvalonRoom().then((result) => {
        if (result.ok && result.data) {
          const room = result.data;
          setRoomId(room.id);
          setView(room.view);
          setConfig((current) => current ?? room.view.config);
        }
      });
      void listAvalonRooms().then((result) => {
        if (result.ok) setRooms(result.data);
        else setError(result.error);
      });
    });
  }, [preview]);

  useAvalonEvents(roomId, busy, !!preview, async () => {
    if (roomId) {
      const result = await getAvalonRoom(roomId);
      if (result.ok) setView(previous => JSON.stringify(previous) === JSON.stringify(result.data.view) ? previous : result.data.view);
      else if (result.error === "방 참가자가 아닙니다." || result.error === "방을 찾을 수 없습니다.") {
        setRoomId(""); setView(null); setConfig(null);
      }
    } else {
      const result = await listAvalonRooms();
      if (result.ok) setRooms(result.data);
      else setError(result.error);
    }
  });

  useEffect(() => {
    const timer = setTimeout(() => {
      if (view?.phase === "propose") {
        setTeam([]);
        setWatchHolder("");
        setProposalPick("team");
        setMissionChoice(view.mission);
      }
      if (view?.phase === "assassinate") setAssassinationKind("merlin");
      if (view?.phase === "lobby") setCompositionOpen(false);
      setTarget("");
      setSecondTarget("");
    }, 0);
    return () => clearTimeout(timer);
  }, [view?.phase, view?.mission]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setTarget("");
      setPlotCardChoice("");
    }, 0);
    return () => clearTimeout(timer);
  }, [plotOpportunityActor, nextPlotCard, pendingPlotCard, pendingPlotHolder]);

  const activeUser = user;
  const me = view?.players.find((p) => p.id === activeUser.id);
  const isHost = view?.hostId === activeUser.id || role === "super_admin";
  const setConfigDraft = (next: Config) => {
    configDirty.current = true;
    setConfig(next);
  };
  const required = view
    ? TEAM_COUNTS[view.players.length]?.[missionChoice - 1] +
      Number(view.config.trapper)
    : 0;
  const selectedRoles = view?.myRole.map((r) => ROLES[r].name).join(" · ");
  const latestVote = view?.voteHistory.at(-1);
  const showingCurrentVote =
    view &&
    [
      "plot_king",
      "plot_forced",
      "plot_ambush",
      "excalibur_assign",
      "excalibur",
      "trapper",
    ].includes(view.phase);
  const showingRejectedVote = Boolean(
    rejectedVoteAt &&
    rejectionRevealExpiredFor !== rejectedVoteAt &&
    latestVote &&
    !latestVote.approved &&
    latestVote.mission === view?.mission &&
    (view.phase === "propose" || view.phase === "finished"),
  );
  const boardVotes =
    view?.phase === "vote"
      ? view.earlyVotes
      : showingRejectedVote && latestVote
        ? latestVote.votes
        : (view?.phase === "quest" || showingCurrentVote) &&
            latestVote?.approved &&
            latestVote.mission === view.mission
          ? latestVote.votes
          : {};
  const boardTeam =
    view?.phase === "propose" && me?.seat === view.leaderSeat
      ? team
      : (view?.proposal ?? []);
  const canPickTeam = view?.phase === "propose" && me?.seat === view.leaderSeat;
  const rogueWatchEnabled = Boolean(
    view &&
    view.config.goodSlots
      .concat(view.config.evilSlots)
      .some(
        (slot) => slot.includes("good_rogue") || slot.includes("evil_rogue"),
      ) &&
    (view.players.length >= 7 || missionChoice > 2),
  );
  const canPickLady =
    view?.phase === "lady" && view.ladyHolder === activeUser.id;
  const canAssassinate =
    view?.phase === "assassinate" &&
    (view.recruited
      ? view.recruited === activeUser.id
      : view.myRole.includes("assassin"));
  const canPickActionTarget = (id: string, seat: number) => {
    if (!view) return false;
    if (view.phase === "plot_distribute")
      return me?.seat === view.leaderSeat && id !== activeUser.id;
    if (view.phase === "plot_immediate") {
      const pending = view.plotPending;
      if (
        !pending ||
        (pending.card === "show_your_strength"
          ? me?.seat !== view.leaderSeat
          : pending.holder !== activeUser.id) ||
        id === activeUser.id
      )
        return false;
      if (pending.card === "are_you_the_one")
        return (
          Math.min(
            Math.abs(seat - me!.seat),
            view.players.length - Math.abs(seat - me!.seat),
          ) === 1
        );
      if (pending.card === "restore_your_honor")
        return (view.plotHands[id] ?? []).length > 0;
      return true;
    }
    if (view.phase === "plot_forced" || view.phase === "plot_ambush")
      return (
        view.plotOpportunity[0] === activeUser.id && view.proposal.includes(id)
      );
    if (view.phase === "excalibur_assign")
      return (
        me?.seat === view.leaderSeat &&
        view.proposal.includes(id) &&
        id !== activeUser.id
      );
    if (view.phase === "excalibur")
      return (
        view.excaliburHolder === activeUser.id &&
        view.proposal.includes(id) &&
        id !== activeUser.id
      );
    if (view.phase === "trapper")
      return me?.seat === view.leaderSeat && view.proposal.includes(id);
    if (view.phase === "recruit")
      return view.myRole.includes("assassin") && id !== activeUser.id;
    if (view.phase === "gawain_check")
      return view.myRole.includes("gawain") && view.proposal.includes(id);
    return false;
  };
  const actionLabel = view ? getPendingAvalonAction(view, activeUser.id) : null;
  const actionTurnKey =
    actionLabel && view
      ? [
          roomId,
          view.phase,
          view.phaseStartedAt,
          view.mission,
          view.rejected,
          view.leaderSeat,
          view.voteHistory.length,
          view.results.length,
          view.plotOpportunity[0],
          view.plotDrawn.length,
          view.plotPending?.card,
          view.plotPending?.holder,
          view.pendingCheck?.target,
          view.proposal.join(","),
        ].join(":")
      : null;
  const reminderActionLabel = actionLabel;

  useEffect(() => {
    if (!roomId || view?.phase === "lobby") {
      seenActionTurns.current.clear();
      return;
    }
    if (
      !actionTurnKey ||
      !reminderActionLabel ||
      seenActionTurns.current.has(actionTurnKey)
    )
      return;
    seenActionTurns.current.add(actionTurnKey);
    // 역할 확인은 게임 시작 알림에 포함된다.
    if (view?.phase !== "reveal")
      showGameNotification("AVALON 내 차례", reminderActionLabel);
  }, [roomId, view?.phase, actionTurnKey, reminderActionLabel]);

  useEffect(() => {
    if (!actionTurnKey || !reminderActionLabel) return;
    const timer = setTimeout(() => setReminderTurnKey(actionTurnKey), 5000);
    return () => clearTimeout(timer);
  }, [actionTurnKey, reminderActionLabel]);

  // 방장이 대기실에서 바꾼 유효한 설정은 잠시 뒤 자동으로 방에 저장한다.
  useEffect(() => {
    if (
      busy ||
      !isHost ||
      view?.phase !== "lobby" ||
      !config ||
      !roomId ||
      !configDirty.current
    )
      return;
    if (
      JSON.stringify(config) === JSON.stringify(view.config) ||
      validateConfig(config) ||
      config.playerCount < view.players.length
    )
      return;
    const timer = setTimeout(() => {
      configDirty.current = false;
      void send({ type: "config", config });
    }, 500);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, view, busy, isHost, roomId]);

  return (
    <main className="flex-1 bg-[var(--paper)] px-4 pb-5 text-slate-900 sm:px-6 sm:pb-8">
      <div className="mx-auto max-w-4xl space-y-5 pt-4">
        {!view && <div className="flex justify-end">
          <button type="button" onClick={() => setRulebookOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-800">
            <BookOpen size={16}/> 룰북
          </button>
        </div>}
        {error && (
          <div
            role="alert"
            className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-600"
          >
            {error}
          </div>
        )}

        {!view ? (
          <Lobby
            user={user}
            rooms={rooms}
            refresh={async () => {
              const result = await listAvalonRooms();
              if (result.ok) setRooms(result.data);
              else setError(result.error);
            }}
            busy={busy}
            admin={role === "super_admin"}
            create={create}
            join={join}
            stats={openStats}
            manage={(r) =>
              void (r.phase === "lobby" ? dissolveRoom(r) : finishVoteRoom(r))
            }
          />
        ) : (
          <>
            {view.needsConsent && (
              <RoomConsent
                id={user.id}
                accept={async () => {
                  await join(roomId, null, true);
                }}
              />
            )}

            <div
              className={
                view.phase === "lobby"
                  ? ""
                  : "grid items-stretch gap-5 md:grid-cols-[minmax(0,3fr)_minmax(0,1fr)]"
              }
            >
              <section className="flex min-w-0 flex-col rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-violet-600">
                      {view.roomTitle ?? "아발론"}
                    </p>
                    <h2 className="mt-1 text-2xl font-bold">
                      {view.phase === "lobby"
                        ? ""
                        : view.phase === "finished"
                          ? "게임 종료"
                          : view.phase === "best_player_vote"
                            ? "베스트 플레이어 투표"
                            : `${view.mission}차 원정`}
                    </h2>
                  </div>
                  <div className="flex flex-wrap items-center justify-end gap-2">
                    {view?.phase === "lobby" && (
                      <LobbySettings
                        id={roomId}
                        canManage={isHost}
                        isPrivate={!!view.isPrivate}
                        names={!!view.useRealNames}
                        code={view.joinCode ?? null}
                        refresh={reload}
                      />
                    )}

                    <button
                      type="button"
                      onClick={() => setRulebookOpen(true)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-sm font-semibold text-violet-800 focus-visible:outline-2 focus-visible:outline-violet-600"
                    >
                      <BookOpen size={16} /> 룰북
                    </button>
                  </div>
                </div>
                <div className="flex items-end justify-end">
                  {view.phase !== "lobby" && (
                    <RejectionTrack
                      rejected={view.rejected}
                      active={
                        view.phase !== "finished" &&
                        view.phase !== "best_player_vote"
                      }
                    />
                  )}
                </div>
                {view.phase !== "lobby" && (
                  <div className="mt-auto grid grid-cols-5 gap-1.5 pt-2.25">
                    {Array.from({ length: 5 }, (_, i) => {
                      const result = view.results.find(
                        (r) => r.number === i + 1,
                      );
                      const current =
                        view.phase !== "finished" && view.mission === i + 1;
                      const teamSize =
                        TEAM_COUNTS[view.players.length][i] +
                        Number(view.config.trapper);
                      const status = result
                        ? result.success
                          ? "성공"
                          : "실패"
                        : current
                          ? "진행 중"
                          : "대기";
                      return (
                        <div
                          key={i}
                          aria-label={`${i + 1}차 원정 · 원정대 ${teamSize}명 · ${status}${i === 3 && view.players.length >= 7 ? " · 실패 2명부터 실패" : ""}`}
                          className={`relative flex min-h-13.5 flex-col items-center justify-start rounded-lg px-1 py-2 text-center text-xs font-bold ${result ? (result.success ? "bg-blue-100 text-blue-800" : "bg-red-100 text-red-800") : "bg-slate-100 text-slate-500"}`}
                        >
                          {i === 3 && view.players.length >= 7 && (
                            <span className="absolute -top-2 left-1/2 z-10 -translate-x-1/2 whitespace-nowrap rounded bg-gray-100 px-1 text-[11px] leading-4 text-slate-500">
                              (실패 2명)
                            </span>
                          )}
                          <span className="text-lg leading-none">
                            {teamSize}
                            <span className="ml-0.25 md:ml-0.5 text-xs">
                              명
                            </span>
                          </span>
                          <span>{status}</span>
                          {current && (
                            <ShieldHalf
                              role="img"
                              aria-label="현재 원정"
                              className="absolute top-1 right-0 md:right-1 size-6 md:size-8 fill-amber-100 text-amber-700"
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
              {view.phase !== "lobby" && (
                <section className="flex min-w-0 flex-col rounded-2xl bg-white p-2 shadow-sm sm:p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <h2 className="flex min-w-0 items-center gap-2 font-bold text-2xl">
                      {showSecret ? (
                        <Eye size={18} className="shrink-0" />
                      ) : (
                        <EyeOff size={18} className="shrink-0" />
                      )}{" "}
                      내 정보
                    </h2>
                    <button
                      type="button"
                      aria-expanded={showSecret}
                      onClick={() => setShowSecret((visible) => !visible)}
                      className="shrink-0 rounded-lg border border-violet-200 px-3 py-2 text-sm font-medium text-violet-800"
                    >
                      {showSecret ? "가리기" : "보기"}
                    </button>
                  </div>
                  {showSecret && (
                    <div
                      id="avalon-secret"
                      className="mt-3 min-w-0 flex-1 rounded-xl bg-violet-50 p-2 text-sm text-violet-900 md:mb-3 [overflow-wrap:anywhere]"
                    >
                      <p className="font-bold text-violet-950">
                        {selectedRoles ||
                          (view.mySide === "good" ? "충신" : "하수인")}{" "}
                        · {view.mySide === "good" ? "선" : "악"} 진영
                      </p>
                      {view.myKnowledge.map((row, i) => (
                        <div key={i} className="mt-3">
                          <p className="font-semibold">{row.label}</p>
                          <div className="mt-1 flex flex-wrap gap-1.5">
                            {(row.players.length ? row.players : ["없음"]).map(
                              (name, index) => (
                                <span
                                  key={`${name}-${index}`}
                                  className="max-w-full rounded-lg border border-violet-200 bg-white px-2 py-1 text-xs font-medium whitespace-normal [overflow-wrap:anywhere]"
                                >
                                  {name}
                                </span>
                              ),
                            )}
                          </div>
                        </div>
                      ))}
                      {view.myFindings.map((finding, i) => (
                        <p key={i} className="mt-3">
                          진영 조사:{" "}
                          {
                            view.players.find((p) => p.id === finding.target)
                              ?.name
                          }{" "}
                          → {finding.side === "good" ? "선" : "악"}
                        </p>
                      ))}
                      {view.myCardPeeks.map((peek, i) => {
                        const targetName =
                          view.players.find(
                            (player) => player.id === peek.target,
                          )?.name ?? "알 수 없음";
                        if (
                          "card" in peek &&
                          peek.source === "excalibur" &&
                          peek.mission
                        ) {
                          return (
                            <p key={i} className="mt-3">
                              {peek.mission}차 원정 - {targetName} -{" "}
                              {cardName[peek.card]}
                            </p>
                          );
                        }
                        return (
                          <p key={i} className="mt-3">
                            {targetName} →{" "}
                            {"unplayedCard" in peek
                              ? gawainPeekLabel(peek.unplayedCard)
                              : "submittedSuccess" in peek
                                ? gawainPeekLabel(
                                    peek.submittedSuccess
                                      ? peek.unplayedMagic
                                        ? "magic"
                                        : "fail"
                                      : "success",
                                  )
                                : `확인한 카드: ${cardName[peek.card]}`}
                          </p>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}
            </div>

            {view.phase === "lobby" ? (
              <>
                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <h2 className="font-bold text-2xl">
                      참가자 {view.players.length}/{view.config.playerCount}
                    </h2>
                    <button
                      type="button"
                      className={secondary}
                      onClick={openStats}
                    >
                      전적 보기
                    </button>
                  </div>
                  <div className="mt-3 grid gap-2 sm:grid-cols-2">
                    {view.players.map((p) => (
                      <div
                        key={p.id}
                        className="flex items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 py-2 text-sm"
                      >
                        <span className="flex min-w-0 items-center gap-2">
                          <PlayerAvatar name={p.name} />
                          <span className="truncate">
                            {p.seat + 1}. {p.name}
                          </span>
                          {p.id === view.hostId && (
                            <Crown
                              aria-label="방장"
                              className="size-4 shrink-0 text-amber-700"
                            />
                          )}
                        </span>
                        {isHost && p.id !== view.hostId && (
                          <button
                            type="button"
                            className="shrink-0 rounded-lg border border-red-200 px-2 py-1 text-xs font-semibold text-red-600"
                            disabled={busy}
                            onClick={() =>
                              void send({ type: "kick", playerId: p.id })
                            }
                          >
                            추방
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button
                      className={secondary}
                      disabled={busy}
                      onClick={async () => {
                        const result = await leaveAvalonRoom(roomId);
                        if (result.ok) {
                          setRoomId("");
                          setView(null);
                          setConfig(null);
                          const list = await listAvalonRooms();
                          if (list.ok) setRooms(list.data);
                        } else setError(result.error);
                      }}
                    >
                      방 나가기
                    </button>
                    <button
                      type="button"
                      className={secondary}
                      onClick={() => void enableGameNotification()}
                    >
                      게임 알림 켜기
                    </button>
                    {isHost && (
                      <button
                        className={primary}
                        disabled={
                          busy ||
                          view.players.length !== view.config.playerCount ||
                          Boolean(
                            config &&
                            JSON.stringify(config) !==
                              JSON.stringify(view.config),
                          )
                        }
                        onClick={() => void send({ type: "start" })}
                      >
                        게임 시작
                      </button>
                    )}
                  </div>
                  {notificationFeedback && (
                    <p role="status" className="mt-2 text-sm text-slate-500">
                      {notificationFeedback}
                    </p>
                  )}
                </section>
                <RoleComposition config={view.config} />
                {isHost && config && (
                  <ConfigEditor
                    config={config}
                    setConfig={setConfigDraft}
                    busy={busy}
                    save={() => {
                      configDirty.current = false;
                      void send({ type: "config", config });
                    }}
                  />
                )}
              </>
            ) : (
              <>
                <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                  <h2 className="font-bold text-2xl">참가자와 원정 팀</h2>
                  {canPickTeam && (
                    <>
                      <p className="mt-1 text-sm text-slate-500">
                        원정 팀원 {required}명을 선택하세요. {team.length}/
                        {required}명 선택
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {(
                          [
                            ["team", `원정 팀 ${team.length}/${required}`],
                            ...(rogueWatchEnabled
                              ? [
                                  [
                                    "watch",
                                    `도적 감시: ${view.players.find((p) => p.id === watchHolder)?.name ?? "미선택"}`,
                                  ],
                                ]
                              : []),
                          ] as [typeof proposalPick, string][]
                        ).map(([mode, label]) => (
                          <button
                            key={mode}
                            type="button"
                            aria-pressed={proposalPick === mode}
                            onClick={() => setProposalPick(mode)}
                            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${proposalPick === mode ? (mode === "watch" ? "border-violet-500 bg-violet-100 text-violet-900" : "border-amber-500 bg-amber-100 text-amber-900") : "border-slate-300 bg-white text-slate-500"}`}
                          >
                            {label}
                          </button>
                        ))}
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        {proposalPick === "team"
                          ? "참가자 카드를 눌러 팀을 구성하세요."
                          : "팀원 한 명을 눌러 감시 대상으로 지정하세요."}
                      </p>
                    </>
                  )}
                  {canPickLady && (
                    <p className="mt-1 text-sm text-slate-500">
                      호수의 여인으로 확인할 참가자를 선택하세요. X 표시는 이미
                      여인을 보유했던 사람입니다.
                    </p>
                  )}
                  {canAssassinate && (
                    <p className="mt-1 text-sm text-slate-500">
                      선 진영 참가자를 눌러 암살 대상을 선택하세요.
                    </p>
                  )}
                  {view.phase !== "propose" &&
                    view.phase !== "lady" &&
                    view.phase !== "assassinate" &&
                    view.players.some((p) =>
                      canPickActionTarget(p.id, p.seat),
                    ) && (
                      <p className="mt-1 text-sm text-slate-500">
                        대상 참가자 카드를 직접 눌러 선택하세요.
                      </p>
                    )}
                  <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-5 lg:grid-cols-5">
                    {view.players.map((p) => {
                      const selected = boardTeam.includes(p.id);
                      const vote = boardVotes[p.id];
                      const ladyCandidate =
                        canPickLady &&
                        p.id !== activeUser.id &&
                        !view.ladyUsed.includes(p.id);
                      const assassinationCandidate =
                        canAssassinate &&
                        p.id !== activeUser.id &&
                        p.side === "good";
                      const assassinationSelected =
                        assassinationCandidate &&
                        (target === p.id || secondTarget === p.id);
                      const proposalCandidate =
                        canPickTeam &&
                        !(
                          view.gawainExiled && p.publicRoles.includes("gawain")
                        ) &&
                        (proposalPick === "team" || team.includes(p.id));
                      const actionCandidate = canPickActionTarget(p.id, p.seat);
                      const assigningExcalibur =
                        view.phase === "excalibur_assign" && target === p.id;
                      const excaliburSelected =
                        view.phase === "excalibur" && target === p.id;
                      const ownsExcalibur =
                        view.config.excalibur &&
                        (assigningExcalibur || view.excaliburHolder === p.id);
                      const otherSelected =
                        (canPickTeam &&
                          watchHolder === p.id &&
                          rogueWatchEnabled) ||
                        (actionCandidate &&
                          view.phase !== "excalibur_assign" &&
                          target === p.id);
                      const complete =
                        (view.phase === "reveal" && p.seen) ||
                        (showCompletionChecks &&
                          view.phase === "vote" &&
                          view.voteSubmitted.includes(p.id)) ||
                        (showCompletionChecks &&
                          view.phase === "quest" &&
                          view.cardSubmitters.includes(p.id));
                      const roles =
                        p.roles.map((role) => ROLES[role].name).join(" + ") ||
                        (p.side === "good" ? "충신" : "하수인");
                      return (
                        <div
                          key={p.id}
                          className={`relative min-w-0 rounded-xl border p-2.5 pb-1.5 text-center text-sm ${assassinationSelected ? "border-violet-600 bg-violet-50 ring-2 ring-inset ring-violet-600" : assigningExcalibur ? "border-amber-500 bg-amber-50 ring-2 ring-inset ring-amber-500" : excaliburSelected ? "border-red-500 bg-red-50 ring-2 ring-inset ring-red-500" : otherSelected ? "border-violet-500 bg-violet-50 ring-2 ring-inset ring-violet-500" : view.phase === "finished" || view.phase === "best_player_vote" || view.phase === "assassinate" ? (p.side === "good" ? "border-blue-500 bg-blue-50" : "border-red-500 bg-red-50") : view.phase === "lady" && p.id === view.ladyHolder ? "lady-border-pulse border-blue-500 bg-blue-50" : view.phase === "propose" && p.seat === view.leaderSeat ? `leader-border-pulse border-red-500 ${selected ? "bg-amber-50" : "bg-slate-100"}` : ladyCandidate && target === p.id ? "border-blue-500 bg-blue-50 ring-2 ring-inset ring-blue-500" : selected ? "border-amber-500 bg-amber-50" : "border-slate-300 bg-slate-100"}`}
                        >
                          {ownsExcalibur && <ExcaliburSword />}
                          {view.phase === "finished" ||
                          view.phase === "best_player_vote" ? (
                            <span className="pointer-events-none absolute inset-x-1 top-1 z-10 block whitespace-normal break-keep text-center text-[11px] leading-tight font-semibold text-violet-900 mt-3 -mb-3">
                              {roles}
                            </span>
                          ) : (
                            <>
                              {p.seat === view.leaderSeat && (
                                <Crown
                                  role="img"
                                  aria-label="리더 토큰"
                                  className="absolute left-4 top-3.25 size-8 fill-rose-100 text-red-600"
                                />
                              )}
                              {excaliburSelected ? (
                                <ArrowLeftRight
                                  aria-label="엑스칼리버 대상 선택됨"
                                  className="absolute right-2 top-2 size-8 rounded-full bg-red-100 p-1 text-red-600"
                                />
                              ) : otherSelected ? (
                                <Check
                                  aria-label="대상 선택됨"
                                  className="absolute right-2 top-2 size-8 rounded-full bg-violet-100 p-1 text-violet-700"
                                />
                              ) : target === p.id && canPickLady ? (
                                <Check
                                  aria-label="여인 확인 대상 선택됨"
                                  className="absolute right-2 top-2 size-8 rounded-full bg-blue-100 p-1 text-blue-700"
                                />
                              ) : assassinationSelected ? (
                                <Check
                                  aria-label="암살 대상 선택됨"
                                  className="absolute right-2 top-2 size-8 rounded-full bg-violet-300 p-1 text-violet-700"
                                />
                              ) : view.phase === "lady" &&
                                view.ladyUsed.includes(p.id) ? (
                                <X
                                  aria-label="호수의 여인 사용 완료"
                                  className="absolute right-2 top-2 size-8 text-slate-500"
                                />
                              ) : (
                                p.id === view.ladyHolder && (
                                  <LadyIcon
                                    role="img"
                                    aria-label="호수의 여인 토큰"
                                    strokeWidth={2}
                                    className="absolute right-2.5 top-1.75 h-10 w-6 text-blue-500"
                                  />
                                )
                              )}{" "}
                            </>
                          )}
                          <button
                            type="button"
                            disabled={
                              busy ||
                              (!proposalCandidate &&
                                !ladyCandidate &&
                                !assassinationCandidate &&
                                !actionCandidate)
                            }
                            aria-pressed={
                              canPickTeam
                                ? proposalPick === "team"
                                  ? selected
                                  : watchHolder === p.id
                                : ladyCandidate
                                  ? target === p.id
                                  : assassinationCandidate
                                    ? assassinationSelected
                                    : actionCandidate
                                      ? target === p.id
                                      : undefined
                            }
                            onClick={() => {
                              if (ladyCandidate) {
                                setTarget(target === p.id ? "" : p.id);
                              } else if (assassinationCandidate) {
                                if (assassinationKind !== "merlin") {
                                  if (target === p.id) {
                                    setTarget(secondTarget);
                                    setSecondTarget("");
                                  } else if (secondTarget === p.id)
                                    setSecondTarget("");
                                  else if (!target) setTarget(p.id);
                                  else setSecondTarget(p.id);
                                } else setTarget(target === p.id ? "" : p.id);
                              } else if (
                                canPickTeam &&
                                proposalPick === "team"
                              ) {
                                setTeam(
                                  selected
                                    ? team.filter((id) => id !== p.id)
                                    : team.length < required
                                      ? [...team, p.id]
                                      : team,
                                );
                                if (selected && watchHolder === p.id)
                                  setWatchHolder("");
                              } else if (
                                canPickTeam &&
                                proposalPick === "watch"
                              )
                                setWatchHolder(
                                  watchHolder === p.id ? "" : p.id,
                                );
                              else if (actionCandidate) {
                                setTarget(target === p.id ? "" : p.id);
                                setPlotCardChoice("");
                              }
                            }}
                            className="w-full rounded-lg p-1 focus-visible:outline-2 focus-visible:outline-violet-600 disabled:cursor-default"
                          >
                            <span
                              className={`flex items-center justify-center h-8`}
                              aria-hidden="true"
                            >
                              {view.phase === "finished" ||
                              view.phase === "best_player_vote" ? (
                                <span className="invisible whitespace-normal break-keep text-[11px] leading-tight">
                                  {roles}
                                </span>
                              ) : (
                                selected && (
                                  <ShieldHalf className="-mt-1 size-10 fill-amber-100 text-amber-700" />
                                )
                              )}
                            </span>
                            <span className="relative mt-1 flex h-7 min-w-0 items-center justify-center">
                              <span className="absolute -left-0.5 top-1/2 -translate-y-1/2">
                                <PlayerAvatar name={p.name} />
                              </span>
                              <span className="inline-flex max-w-[calc(100%-4.5rem)] min-w-0 items-center justify-center gap-0.5 font-semibold">
                                <span className="truncate">{p.name}</span>
                                {view.assassinated.includes(p.id) && (
                                  <Skull
                                    aria-label="암살 대상"
                                    className="absolute right-2 size-8 shrink-0 text-red-600"
                                  />
                                )}
                              </span>
                              {vote !== undefined && (
                                <>
                                  <span
                                    role="img"
                                    aria-label={
                                      vote ? "찬성 투표" : "반대 투표"
                                    }
                                    className={`absolute right-0 top-1/2 size-7 -translate-y-1/2 rounded-full border border-slate-700
                          ${vote ? "bg-white" : "bg-slate-900"}`}
                                  />
                                  <span
                                    role="caption"
                                    aria-label={
                                      vote ? "찬성 투표" : "반대 투표"
                                    }
                                    className="absolute text-xs right-[3.5px] top-7.5"
                                  >
                                    {vote ? "찬성" : "반대"}
                                  </span>
                                </>
                              )}
                              {vote === undefined && complete && (
                                <Check
                                  aria-label={
                                    view.phase === "reveal"
                                      ? "역할 확인 완료"
                                      : view.phase === "vote"
                                        ? "투표 완료"
                                        : "원정 카드 제출 완료"
                                  }
                                  className="absolute right-0 top-1/2 size-7 -translate-y-1/2 rounded-full bg-blue-100 p-1 text-blue-700"
                                />
                              )}
                            </span>
                            {p.publicRoles.includes("king_arthur") && (
                              <span className="absolute mt-1.5 block rounded-md bg-amber-100 px-0.75 py-0.25 text-[10px] font-bold text-amber-900">
                                아서왕
                              </span>
                            )}
                            {view.gawainExiled &&
                              p.publicRoles.includes("gawain") && (
                                <span className="absolute mt-1.5 left-2.5 block rounded-md bg-red-100 px-0.75 py-0.25 text-[10px] font-bold text-red-800">
                                  원정 추방
                                </span>
                              )}
                            <span className="block h-5 text-xs text-slate-500">
                              {assassinationSelected
                                ? target === p.id
                                  ? assassinationKind === "merlin"
                                    ? "암살 대상"
                                    : "첫 번째 대상"
                                  : "두 번째 대상"
                                : excaliburSelected
                                  ? "엑스칼리버"
                                  : otherSelected
                                    ? view.phase === "propose"
                                      ? "감시 대상"
                                      : "선택 대상"
                                    : p.seat === view.leaderSeat
                                      ? "리더"
                                      : selected
                                        ? "원정 팀"
                                        : "\u00a0"}
                            </span>
                          </button>
                          <PlayerNote
                            name={p.name}
                            value={notes[p.name] ?? ""}
                            disabled={!notesReady}
                            onChange={updateNote}
                          />
                        </div>
                      );
                    })}
                  </div>
                  {view.phase === "propose" && (
                    <div className="mt-4 border-t border-slate-300 pt-4">
                      {canPickTeam ? (
                        <>
                          {view.config.targeting && (
                            <label className="block text-sm">
                              원정 선택{" "}
                              <select
                                className={`${field} ml-2`}
                                value={missionChoice}
                                onChange={(e) => {
                                  setMissionChoice(Number(e.target.value));
                                  setTeam([]);
                                  setWatchHolder("");
                                  setProposalPick("team");
                                }}
                              >
                                {[1, 2, 3, 4, 5]
                                  .filter(
                                    (n) =>
                                      !view.results.some(
                                        (r) => r.number === n,
                                      ) &&
                                      (n !== 5 ||
                                        view.results.filter((r) => r.success)
                                          .length >= 2),
                                  )
                                  .map((n) => (
                                    <option key={n} value={n}>
                                      {n}차
                                    </option>
                                  ))}
                              </select>
                            </label>
                          )}
                          {showingRejectedVote && (
                            <p className="mt-3 text-sm text-amber-700">
                              투표 결과가 공개되는 5초 동안 팀을 고를 수
                              있습니다. 최종 제안은 잠시 뒤 가능합니다.
                            </p>
                          )}
                          <button
                            className={`${primary} mt-4 w-full`}
                            disabled={
                              busy ||
                              showingRejectedVote ||
                              team.length !== required ||
                              (rogueWatchEnabled && !watchHolder)
                            }
                            onClick={() =>
                              void send({
                                type: "propose",
                                team,
                                mission: missionChoice,
                                rogueWatchHolder: watchHolder,
                              })
                            }
                          >
                            팀 제안하기
                          </button>
                        </>
                      ) : (
                        <p className="text-sm text-slate-500">
                          리더가 원정 팀을 고르고 있습니다.
                        </p>
                      )}
                    </div>
                  )}
                </section>
                {view.phase !== "propose" && (
                  <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                    <PhaseControls
                      view={view}
                      user={activeUser}
                      busy={busy}
                      send={send}
                      onReturnToRooms={returnToRooms}
                      target={target}
                      setTarget={setTarget}
                      secondTarget={secondTarget}
                      setSecondTarget={setSecondTarget}
                      assassinationKind={assassinationKind}
                      setAssassinationKind={setAssassinationKind}
                      plotCardChoice={plotCardChoice}
                      setPlotCardChoice={setPlotCardChoice}
                    />
                  </section>
                )}
                {isHost &&
                  view.phase !== "finished" &&
                  view.phase !== "best_player_vote" && (
                    <button
                      className={`${secondary} w-full border-red-200 text-red-600`}
                      disabled={busy}
                      onClick={() => void send({ type: "stop" })}
                    >
                      게임 중단하고 대기실로
                    </button>
                  )}
                {view.phase === "finished" && (
                  <button
                    className={`${secondary} w-full`}
                    onClick={async () => {
                      setRoomId("");
                      setView(null);
                      const result = await listAvalonRooms();
                      if (result.ok) setRooms(result.data);
                    }}
                  >
                    열린 방 목록으로
                  </button>
                )}
                {view.config.plot && (
                  <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
                    <h2 className="font-bold text-2xl">공개 플롯 카드</h2>
                    <div className="mt-2 space-y-1 text-sm text-slate-500">
                      {view.players.map((p) => (
                        <div key={p.id}>
                          {p.name}:{" "}
                          {(view.plotHands[p.id] ?? [])
                            .map((card) => plotName[card])
                            .join(", ") || "없음"}
                        </div>
                      ))}
                    </div>
                  </section>
                )}
                {(view.voteHistory.length > 0 ||
                  view.results.length > 0 ||
                  view.publicEvents.length > 0) && <GameHistory view={view} />}
              </>
            )}
          </>
        )}
      </div>
      {!busy && reminderActionLabel && reminderTurnKey === actionTurnKey && (
        <div
          role="alert"
          className="avalon-turn-reminder-blink pointer-events-none fixed right-4 bottom-[calc(1rem+env(safe-area-inset-bottom))] z-40 w-[min(30rem,calc(100vw-2rem))] rounded-2xl bg-red-600 px-4 py-3 text-sm font-bold text-white shadow-xl sm:right-6 sm:bottom-6"
        >
          <p>지금 행동할 차례예요</p>
          <p className="mt-1 text-red-100">{reminderActionLabel}</p>
        </div>
      )}
      {teamAssignmentOpen && role === "super_admin" && (
        <TeamAssignmentModal
          onClose={() => setTeamAssignmentOpen(false)}
          onCreated={refreshAfterTeamCreation}
        />
      )}
      {rulebookOpen && (
        <RulebookModal
          onClose={() => setRulebookOpen(false)}
          turnKey={actionTurnKey}
          actionLabel={actionLabel}
        />
      )}
      {compositionOpen && view && view.phase !== "lobby" && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 p-4"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setCompositionOpen(false);
          }}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="avalon-composition-title"
            onKeyDown={(event) => {
              if (event.key === "Escape") setCompositionOpen(false);
            }}
            className="flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
          >
            <div className="flex items-start justify-between gap-3 border-b border-slate-300 px-5 py-4">
              <div>
                <h2 id="avalon-composition-title" className="text-lg font-bold">
                  직업 구성
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  이 게임에 포함된 직업과 적용 규칙입니다. 참가자별 직업은
                  공개되지 않습니다.
                </p>
              </div>
              <button
                type="button"
                autoFocus
                className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-violet-600"
                aria-label="직업 구성 닫기"
                onClick={() => setCompositionOpen(false)}
              >
                <X size={20} />
              </button>
            </div>
            <div className="min-h-0 overflow-y-auto p-5">
              <RoleComposition config={view.config} embedded />
            </div>
          </div>
        </div>
      )}
      {statsOpen && <HistoryRankingModal onClose={() => setStatsOpen(false)} />}
    </main>
  );
}
