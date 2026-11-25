"use server";
import { sessionDatabase as createAdminClient } from "@/server/auth/config";
import { requirePlayer } from "@/server/game-rpc";
import type { GameState } from "./rules";
import type {
  Result,
  AvalonGameRecord,
  AvalonGameDetail,
  AvalonPlayerStats,
  AvalonSideStats,
} from "./types";
export async function getAvalonGameRecords(): Promise<
  Result<AvalonGameRecord[]>
> {
  try {
    const viewer = await requirePlayer();
    const db = createAdminClient();
    const records = new Map<string, AvalonGameRecord>();
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from("avalon_game_results")
        .select(
          "game_id, room_id, completed_at, player_id, player_name, side, won, best_player_votes",
        )
        .order("completed_at", { ascending: false })
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      for (const row of data ?? []) {
        const gameId = String(row.game_id);
        let game = records.get(gameId);
        if (!game) {
          game = {
            gameId,
            roomId: String(row.room_id),
            completedAt: String(row.completed_at),
            players: [],
          };
          records.set(gameId, game);
        }
        game.players.push({
          playerId: String(row.player_id),
          playerName: String(row.player_name),
          side: String(row.side),
          won: Boolean(row.won),
          bestPlayerVotes: Number(row.best_player_votes ?? 0),
        });
      }
      if ((data ?? []).length < 1000) break;
    }
    const games = [...records.values()];
    if (viewer.role === "super_admin") return { ok: true, data: games };
    const otherRooms = [
      ...new Set(
        games
          .filter((game) => !game.players.some((p) => p.playerId === viewer.id))
          .map((game) => game.roomId),
      ),
    ];
    const publicRooms = new Set<string>();
    for (let index = 0; index < otherRooms.length; index += 100) {
      const { data, error } = await db
        .from("avalon_rooms")
        .select("id")
        .eq("is_private", false)
        .in("id", otherRooms.slice(index, index + 100));
      if (error) throw new Error(error.message);
      for (const room of data ?? []) publicRooms.add(room.id);
    }
    return {
      ok: true,
      data: games.filter(
        (game) =>
          publicRooms.has(game.roomId) ||
          game.players.some((p) => p.playerId === viewer.id),
      ),
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "전적을 불러오지 못했습니다.",
    };
  }
}

export async function getAvalonGameDetail(
  gameId: string,
  roomId: string,
): Promise<Result<AvalonGameDetail>> {
  try {
    const viewer = await requirePlayer();
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        gameId,
      )
    )
      throw new Error("경기 정보를 확인해 주세요.");
    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        roomId,
      )
    )
      throw new Error("방 정보를 확인해 주세요.");
    const db = createAdminClient();
    const { data: playerRows, error: playersError } = await db
      .from("avalon_game_results")
      .select(
        "room_id, player_id, player_name, side, won, best_player_votes, completed_at",
      )
      .eq("game_id", gameId)
      .order("player_name", { ascending: true });
    if (playersError) throw new Error(playersError.message);
    if (!playerRows?.length) throw new Error("경기 기록을 찾을 수 없습니다.");
    if (playerRows.some((row) => String(row.room_id) !== roomId))
      throw new Error("경기와 방 정보가 일치하지 않습니다.");
    const { data: room, error: roomError } = await db
      .from("avalon_rooms")
      .select("state, updated_at, is_private")
      .eq("id", roomId)
      .maybeSingle();
    if (roomError) throw new Error(roomError.message);
    if (
      (!room || room.is_private) &&
      viewer.role !== "super_admin" &&
      !playerRows.some((p) => p.player_id === viewer.id)
    )
      throw new Error("비공개 경기입니다.");
    const roomState = room?.state as GameState | undefined;
    const stateMatchesGame =
      roomState?.phase === "finished" &&
      (roomState.gameId ?? roomId) === gameId;
    const players = playerRows.map((row) => ({
      playerId: String(row.player_id),
      playerName: String(row.player_name),
      side: String(row.side),
      won: Boolean(row.won),
      bestPlayerVotes: Number(row.best_player_votes ?? 0),
    }));
    return {
      ok: true,
      data: {
        gameId,
        completedAt: String(
          (stateMatchesGame && room?.updated_at) ||
            playerRows[0].completed_at ||
            new Date().toISOString(),
        ),
        state:
          stateMatchesGame && roomState
            ? {
                players: roomState.players,
                winner: roomState.winner,
                results: roomState.results,
                config: roomState.config,
                winReason: roomState.winReason,
                assassinated: roomState.assassinated,
                voteHistory: roomState.voteHistory,
                bestPlayerVotes: roomState.bestPlayerVotes,
                publicEvents: roomState.publicEvents,
                plotHands: roomState.plotHands,
              }
            : null,
        players,
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "경기 상세를 불러오지 못했습니다.",
    };
  }
}

export async function getAvalonPlayerStats(): Promise<
  Result<AvalonPlayerStats[]>
> {
  try {
    await requirePlayer();
    const db = createAdminClient();
    const rows: AvalonPlayerStats[] = [];
    for (let offset = 0; ; offset += 1000) {
      const { data, error } = await db
        .from("avalon_player_stats")
        .select(
          "player_id, player_name, games, wins, good_games, good_wins, evil_games, evil_wins",
        )
        .order("player_id")
        .range(offset, offset + 999);
      if (error) throw new Error(error.message);
      rows.push(
        ...(data ?? []).map((row) => ({
          playerId: row.player_id,
          playerName: row.player_name,
          games: Number(row.games),
          wins: Number(row.wins),
          goodGames: Number(row.good_games),
          goodWins: Number(row.good_wins),
          evilGames: Number(row.evil_games),
          evilWins: Number(row.evil_wins),
        })),
      );
      if ((data ?? []).length < 1000) break;
    }
    return { ok: true, data: rows };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error ? error.message : "승률을 불러오지 못했습니다.",
    };
  }
}

export async function getAvalonSideStats(): Promise<Result<AvalonSideStats>> {
  try {
    await requirePlayer();
    const { data, error } = await createAdminClient()
      .from("avalon_side_stats")
      .select("games, good_wins, evil_wins")
      .single();
    if (error) throw new Error(error.message);
    return {
      ok: true,
      data: {
        games: Number(data.games),
        goodWins: Number(data.good_wins),
        evilWins: Number(data.evil_wins),
      },
    };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "진영별 승률을 불러오지 못했습니다.",
    };
  }
}
