"use server";
import { currentPlayer } from "@/server/auth/session";
import { sessionDatabase } from "@/server/auth/config";
import { gameRpc, requirePlayer } from "@/server/game-rpc";
import { initialState } from "./engine";
import { findMine, findRoom, roomView } from "./room-data";
import type { AvalonRoomSummary, Result } from "./types";

async function result<T>(fn: () => Promise<T>): Promise<Result<T>> {
  try {
    return { ok: true, data: await fn() };
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "방 정보를 불러올 수 없습니다.",
    };
  }
}

export async function listAvalonRooms() {
  return result(async () => {
    const rows = await gameRpc<Omit<AvalonRoomSummary, "phase">[]>(
      "list_avalon_lobbies",
      {},
      true,
    );
    const rooms = rows.map((row) => ({ ...row, phase: "lobby" }));
    if ((await currentPlayer())?.role === "super_admin") {
      const { data, error } = await sessionDatabase()
        .from("avalon_rooms")
        .select("id,title,is_private,use_real_names")
        .eq("state->>phase", "best_player_vote");
      if (error) throw new Error(error.message);
      for (const row of data)
        rooms.push({ ...row, players: 0, phase: "best_player_vote" });
    }
    return rooms;
  });
}

export async function createAvalonRoom(
  title: string,
  isPrivate: boolean,
  useNames: boolean,
) {
  return result(async () => {
    const player = await requirePlayer();
    const id = await gameRpc<string>("create_avalon_room", {
      p_title: title.trim(),
      p_private: isPrivate,
      p_real_names: useNames,
      p_state: initialState({ id: player.id, name: player.nickname }),
    });
    return { id, view: await roomView(await findRoom(id), player.id) };
  });
}
export async function joinAvalonRoom(
  id: string | null,
  code: string | null,
  accept: boolean,
) {
  return result(async () => {
    const player = await requirePlayer();
    const room = await gameRpc<string>("join_avalon_room", {
      p_room: id,
      p_code: code,
      p_accept_real_names: accept,
    });
    return { id: room, view: await roomView(await findRoom(room), player.id) };
  });
}
export async function getAvalonRoom(id: string) {
  return result(async () => {
    const player = await requirePlayer();
    return { id, view: await roomView(await findRoom(id), player.id) };
  });
}
export async function getMyAvalonRoom() {
  return result(async () => {
    const player = await currentPlayer();
    if (!player) return null;
    const room = await findMine(player.id);
    return room ? { id: room.id, view: await roomView(room, player.id) } : null;
  });
}
export async function configureRoom(
  id: string,
  isPrivate: boolean,
  useNames: boolean,
) {
  return result(() =>
    gameRpc<null>("configure_avalon_lobby", {
      p_room: id,
      p_private: isPrivate,
      p_real_names: useNames,
    }),
  );
}
