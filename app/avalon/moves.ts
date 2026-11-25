"use server";
import { sessionDatabase as createAdminClient } from "@/server/auth/config";
import { requirePlayer } from "@/server/game-rpc";
import { findRoom, roomView } from "./room-data";
import { applyMove, leaveRoom, historyFromState, type Move } from "./engine";
import type { GameState } from "./rules";
import type { Result } from "./types";
async function mutate(
  roomId: string,
  transform: (
    state: GameState,
    user: Awaited<ReturnType<typeof requirePlayer>>,
  ) => GameState,
): Promise<
  Result<{ id: string; view: Awaited<ReturnType<typeof roomView>> | null }>
> {
  try {
    const user = await requirePlayer();
    for (let attempt = 0; attempt < 6; attempt++) {
      const row = await findRoom(roomId);
      if (!row.state.players.some((p) => p.id === user.id))
        throw new Error("방 참가자가 아닙니다.");
      const state = transform(row.state, user);
      const changedAt = new Date().toISOString();
      if (
        state.phase !== row.state.phase &&
        (state.phase === "vote" || state.phase === "quest")
      )
        state.phaseStartedAt = changedAt;
      const priorHistory = historyFromState(row.state);
      const explicitHistory =
        state.phase === "lobby" && row.state.phase !== "lobby"
          ? []
          : (state.history ?? []).slice(priorHistory.length);
      const recorded = (type: "vote" | "quest" | "event", index: number) =>
        explicitHistory.some(
          (entry) => entry.type === type && entry.index === index,
        );
      state.history =
        state.phase === "lobby" && row.state.phase !== "lobby"
          ? []
          : [
              ...priorHistory,
              ...explicitHistory,
              ...state.voteHistory
                .slice(row.state.voteHistory.length)
                .map((_, offset) => ({
                  type: "vote" as const,
                  index: row.state.voteHistory.length + offset,
                }))
                .filter((entry) => !recorded(entry.type, entry.index)),
              ...state.results
                .slice(row.state.results.length)
                .map((_, offset) => ({
                  type: "quest" as const,
                  index: row.state.results.length + offset,
                }))
                .filter((entry) => !recorded(entry.type, entry.index)),
              ...state.publicEvents
                .slice(row.state.publicEvents.length)
                .map((_, offset) => ({
                  type: "event" as const,
                  index: row.state.publicEvents.length + offset,
                }))
                .filter((entry) => !recorded(entry.type, entry.index)),
            ];
      state.historyApproximate =
        state.phase === "lobby" && row.state.phase !== "lobby"
          ? false
          : (row.state.historyApproximate ??
            (!row.state.history && priorHistory.length > 0));
      const { data, error } = await createAdminClient()
        .from("avalon_rooms")
        .update({ state, version: row.version + 1, updated_at: changedAt })
        .eq("id", row.id)
        .eq("version", row.version)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data)
        return {
          ok: true,
          data: {
            id: row.id,
            view: state.players.some((p) => p.id === user.id)
              ? await roomView({ ...row, state }, user.id)
              : null,
          },
        };
    }
    throw new Error("동시에 변경된 내용이 있습니다. 다시 시도해 주세요.");
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "요청을 처리하지 못했습니다.",
    };
  }
}

export async function leaveAvalonRoom(roomId: string) {
  try {
    const user = await requirePlayer();
    const row = await findRoom(roomId);
    if (
      row.state.phase === "lobby" &&
      row.state.players.length === 1 &&
      row.state.players[0].id === user.id
    ) {
      const { data, error } = await createAdminClient()
        .from("avalon_rooms")
        .delete()
        .eq("id", row.id)
        .eq("version", row.version)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("방이 변경되었습니다. 다시 시도해 주세요.");
      return { ok: true as const, data: { id: row.id, view: null } };
    }
  } catch (error) {
    return {
      ok: false as const,
      error: error instanceof Error ? error.message : "퇴장하지 못했습니다.",
    };
  }
  return mutate(roomId, (state, user) => leaveRoom(state, user.id));
}

export async function moveAvalonRoom(roomId: string, move: Move) {
  return mutate(roomId, (state, user) =>
    applyMove(
      state,
      user.role === "super_admin" &&
        ["kick", "config", "start", "stop"].includes(move.type)
        ? state.hostId
        : user.id,
      move,
    ),
  );
}
