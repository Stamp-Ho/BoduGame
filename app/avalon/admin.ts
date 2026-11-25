"use server";
import { sessionDatabase as createAdminClient } from "@/server/auth/config";
import { requirePlayer } from "@/server/game-rpc";
import { findRoom } from "./room-data";
import type { Result } from "./types";
import { initialState } from "./engine";
import { defaultConfig, type GameState } from "./rules";
export async function createAvalonRoomsFromTeams(
  teamUserIds: string[][],
): Promise<Result<{ roomIds: string[] }>> {
  try {
    const admin = await requirePlayer();
    if (admin.role !== "super_admin")
      throw new Error("최고 관리자만 팀 편성으로 방을 만들 수 있습니다.");
    if (teamUserIds.length < 1 || teamUserIds.length > 5)
      throw new Error("팀은 1~5개까지 만들 수 있습니다.");
    if (teamUserIds.some((team) => team.length < 1 || team.length > 10))
      throw new Error("각 팀에는 1~10명을 배치해 주세요.");
    const userIds = teamUserIds.flat();
    if (new Set(userIds).size !== userIds.length)
      throw new Error("같은 유저가 여러 팀에 중복 배치되어 있습니다.");
    if (
      userIds.some(
        (id) =>
          !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
            id,
          ),
      )
    )
      throw new Error("유저 계정 ID 형식이 올바르지 않습니다.");

    const db = createAdminClient();
    const { data: profiles, error: profileError } = await db
      .from("game_profiles")
      .select("id, nickname")
      .in("id", userIds);
    if (profileError) throw new Error(profileError.message);
    if ((profiles ?? []).length !== userIds.length)
      throw new Error(
        "선택한 유저 목록이 변경되었습니다. 모달을 닫고 다시 열어 주세요.",
      );
    const people = new Map(
      (profiles ?? []).map((profile) => [
        String(profile.id),
        String(profile.nickname),
      ]),
    );

    const { data: roomRows, error: roomsError } = await db
      .from("avalon_rooms")
      .select("id, state");
    if (roomsError) throw new Error(roomsError.message);
    const assignedElsewhere = new Set(
      (roomRows ?? []).flatMap((row) => {
        const state = row.state as GameState;
        return state.phase === "finished"
          ? []
          : state.players
              .map((player) => player.id)
              .filter((id) => people.has(id));
      }),
    );
    if (assignedElsewhere.size) {
      const names = [...assignedElsewhere]
        .map((id) => people.get(id))
        .filter(Boolean)
        .join(", ");
      throw new Error(
        `이미 열린 방에 참가 중인 유저가 있습니다: ${names}. 해당 방을 먼저 해산하거나 유저를 빼 주세요.`,
      );
    }

    const inserts = teamUserIds.map((teamIds) => {
      const hostId = teamIds[0];
      const hostName = people.get(hostId)!;
      const state = initialState({ id: hostId, name: hostName });
      const template = state.players[0];
      state.players = teamIds.map((id, seat) => ({
        ...template,
        id,
        name: people.get(id)!,
        seat,
      }));
      state.config = defaultConfig(Math.max(5, teamIds.length));
      return { host_user_id: hostId, state };
    });
    const { data, error } = await db
      .from("avalon_rooms")
      .insert(inserts)
      .select("id");
    if (error) throw new Error(error.message);
    return {
      ok: true,
      data: { roomIds: (data ?? []).map((room) => String(room.id)) },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "팀 편성 방 생성에 실패했습니다.",
    };
  }
}

export async function getUsersForTeamAssignment(): Promise<
  Result<{ id: string; name: string }[]>
> {
  try {
    const admin = await requirePlayer();
    if (admin.role !== "super_admin") {
      throw new Error("최고 관리자만 전체 유저 목록을 조회할 수 있습니다.");
    }
    const { data, error } = await createAdminClient()
      .from("game_profiles")
      .select("id, nickname")
      .order("nickname", { ascending: true });
    if (error) throw new Error(error.message);
    return {
      ok: true,
      data: (data ?? []).map((row) => ({
        id: String(row.id),
        name: String(row.nickname),
      })),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "유저 목록을 불러오지 못했습니다.",
    };
  }
}

export async function dissolveAvalonRoom(
  roomId: string,
): Promise<Result<{ id: string }>> {
  try {
    const admin = await requirePlayer();
    if (admin.role !== "super_admin")
      throw new Error("최고 관리자만 방을 해산할 수 있습니다.");
    const row = await findRoom(roomId);
    if (row.state.phase !== "lobby")
      throw new Error("현재 열려 있는 대기실만 해산할 수 있습니다.");
    const { data, error } = await createAdminClient()
      .from("avalon_rooms")
      .delete()
      .eq("id", row.id)
      .eq("version", row.version)
      .select("id")
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!data)
      throw new Error(
        "방이 변경되었습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.",
      );
    return { ok: true, data: { id: row.id } };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "방을 해산하지 못했습니다.",
    };
  }
}

export async function finishAvalonVote(
  roomId: string,
): Promise<Result<{ id: string }>> {
  try {
    const admin = await requirePlayer();
    if (admin.role !== "super_admin")
      throw new Error("최고 관리자만 투표를 종료할 수 있습니다.");
    const db = createAdminClient();
    for (let attempt = 0; attempt < 6; attempt++) {
      const row = await findRoom(roomId);
      if (row.state.phase !== "best_player_vote")
        throw new Error("투표 중인 게임만 종료할 수 있습니다.");
      const state: GameState = { ...row.state, phase: "finished" };
      const { data, error } = await db
        .from("avalon_rooms")
        .update({
          state,
          version: row.version + 1,
          updated_at: new Date().toISOString(),
        })
        .eq("id", row.id)
        .eq("version", row.version)
        .select("id")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (data) return { ok: true, data: { id: row.id } };
    }
    throw new Error(
      "동시에 변경된 내용이 있습니다. 목록을 새로고침한 뒤 다시 시도해 주세요.",
    );
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "투표를 종료하지 못했습니다.",
    };
  }
}
