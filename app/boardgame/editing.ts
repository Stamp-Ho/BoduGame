"use server";
import { currentPlayer } from "@/server/auth/session";
import { sessionDatabase } from "@/server/auth/config";
import type { BoardTileData } from "./types/board";
import type { BoardgameResult } from "./types/session";
import type { GoldCardData } from "./gold-cards/types";
const failure = <T = never>(message: string, code?: string): BoardgameResult<T> => ({
  success: false,
  message,
  ...(code ? { code } : {}),
});

export async function saveBoardgame(input: {
  id: string;
  gridRows: number;
  gridCols: number;
  tiles: BoardTileData[];
  goldCards: GoldCardData[];
  saveGridSize?: boolean;
  saveGoldCards?: boolean;
  editSessionId: string;
  lockedTileId: string | null;
  tileIdRenames?: Array<{ from: string; to: string }>;
}): Promise<BoardgameResult<null>> {
  const actor = await currentPlayer();
  if (!actor) return failure("로그인이 필요합니다.");
  const supabase = sessionDatabase();
  if (
    !Number.isInteger(input.gridRows) || !Number.isInteger(input.gridCols) ||
    input.gridRows < 3 || input.gridRows > 20 ||
    input.gridCols < 3 || input.gridCols > 20
  ) {
    return failure("격자 크기를 확인해 주세요.");
  }

  const tileIds = new Set(input.tiles.map((tile) => tile.id));
  const occupiedCells = new Set<string>();
  for (const tile of input.tiles) {
		if (tile.action.type === 'SKIP_TURNS') {
			const turns = tile.action.params?.turns;
			if (typeof turns !== 'number' || !Number.isSafeInteger(turns) || turns < 1 || turns > 99) {
				return failure(`타일 ${tile.id}의 멈춤 턴 수는 1부터 99 사이의 정수여야 합니다.`);
			}
		}
    if (
      !Number.isInteger(tile.gridR) || !Number.isInteger(tile.gridC) ||
      tile.gridR < 0 || tile.gridR >= input.gridRows ||
      tile.gridC < 0 || tile.gridC >= input.gridCols
    ) {
      return failure(`타일 ${tile.id}의 격자 위치가 범위를 벗어났습니다.`);
    }
    const cell = `${tile.gridR}:${tile.gridC}`;
    if (occupiedCells.has(cell)) return failure("같은 격자 위치에 타일이 중복되었습니다.");
    occupiedCells.add(cell);
    if (tile.nextTileIds.some((id) => !tileIds.has(id))) {
      return failure(`타일 ${tile.id}의 다음 칸 설정에 없는 타일이 포함되어 있습니다.`);
    }
  }

  const { error } = await supabase.rpc("save_boardgame_with_edit_lease", {
    p_actor: actor.id, p_input: input,
    p_session_id: input.editSessionId,
    p_locked_tile_id: input.lockedTileId,
  });
  if (error) return failure(error.message, error.details === 'EDIT_LEASE_LOST' ? 'EDIT_LEASE_LOST' : undefined);
  return { success: true, data: null };
}

export async function acquireBoardgameTileEditLock(
  boardgameId: string,
  tileId: string,
  sessionId: string,
): Promise<BoardgameResult<{ userName: string; expiresAt: string }>> {
  const actor = await currentPlayer();
  if (!actor) return failure("로그인이 필요합니다.");
  const supabase = sessionDatabase();
  const { data, error } = await supabase.rpc("acquire_boardgame_edit_lease", {
    p_actor: actor.id, p_boardgame_id: boardgameId, p_tile_id: tileId, p_session_id: sessionId,
  });
  if (error) return failure(error.message);
  if (!data || data.userId !== actor.id || typeof data.expiresAt !== 'string') {
    return failure("편집 잠금 응답을 확인할 수 없습니다.");
  }
  return { success: true, data: { userName: actor.nickname, expiresAt: data.expiresAt } };
}

export async function renewBoardgameTileEditLock(
  boardgameId: string,
  tileId: string,
  sessionId: string,
): Promise<BoardgameResult<boolean>> {
  const actor = await currentPlayer();
  if (!actor) return failure("로그인이 필요합니다.");
  const supabase = sessionDatabase();
  const { data, error } = await supabase.rpc("renew_boardgame_edit_lease", {
    p_actor: actor.id, p_boardgame_id: boardgameId, p_tile_id: tileId, p_session_id: sessionId,
  });
  if (error) return failure(error.message);
  return { success: true, data: data === true };
}

