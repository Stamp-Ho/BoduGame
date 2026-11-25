import "server-only";
import { sessionDatabase as createAdminClient } from "@/server/auth/config";
import { gameRpc } from "@/server/game-rpc";
import { publicView } from "./engine";
import type { GameState } from "./rules";
type RoomRow = {
  id: string;
  state: GameState;
  version: number;
  title: string;
  is_private: boolean;
  use_real_names: boolean;
  real_name_consents: string[];
  join_code: string | null;
};
export async function findRoom(roomId: string) {
  if (
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      roomId,
    )
  )
    throw new Error("방을 확인해 주세요.");
  const { data, error } = await createAdminClient()
    .from("avalon_rooms")
    .select(
      "id, state, version, title, is_private, use_real_names, real_name_consents, join_code",
    )
    .eq("id", roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("방을 찾을 수 없습니다.");
  return data as RoomRow;
}

export async function findMine(userId: string) {
  const { data, error } = await createAdminClient()
    .from("avalon_rooms")
    .select(
      "id, state, version, title, is_private, use_real_names, real_name_consents, join_code, created_at",
    )
    .contains("state", { players: [{ id: userId }] })
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).find(
    (row) => (row.state as GameState).phase !== "finished",
  ) as RoomRow | undefined;
}

export async function roomView(row: RoomRow, id: string) {
  if (!row.state.players.some((player) => player.id === id))
    throw new Error("방 참가자가 아닙니다.");
  let state = row.state;
  if (row.use_real_names) {
    const names = await gameRpc<{ player_id: string; display_name: string }[]>(
      "avalon_room_names",
      { p_room: row.id },
    );
    const byId = new Map(
      names.map((player) => [player.player_id, player.display_name]),
    );
    const byNickname = new Map(
      state.players.map((player) => [
        player.name,
        byId.get(player.id) ?? player.name,
      ]),
    );
    const displayNames = (message: string) =>
      message.replace(/보드여우-\d+/g, (name) => byNickname.get(name) ?? name);
    state = {
      ...state,
      players: state.players.map((player) => ({
        ...player,
        name: byId.get(player.id) ?? player.name,
      })),
      publicEvents: state.publicEvents.map(displayNames),
      winReason: state.winReason && displayNames(state.winReason),
    };
  }
  const view = publicView(state, id);
  return {
    ...view,
    roomTitle: row.title,
    isPrivate: row.is_private,
    useRealNames: row.use_real_names,
    joinCode: view.phase === "lobby" ? row.join_code : null,
    needsConsent:
      row.use_real_names &&
      !row.is_private &&
      !row.real_name_consents.includes(id),
  };
}
