"use server";

import { gameRpc } from "@/server/game-rpc";
import { sessionDatabase } from "@/server/auth/config";
import { boardResult } from "./server/result";
import { decodeBoard, type BoardRow } from "./server/snapshot";
import { readBoardDrawings } from "./server/drawings";
import { currentPlayer } from "@/server/auth/session";
import type { BoardgameSummary, CreatedBoard } from "./types/session";
export type { BoardgameSummary, BoardgameSnapshot, BoardgameResult } from "./types/session";

export async function listBoardgames() {
  return boardResult(() => gameRpc<BoardgameSummary[]>("boardgame_catalog", {}, true));
}

export async function getBoardgame(id: string) {
  return boardResult(async () => {
    const actor = await currentPlayer();
    const db = sessionDatabase();
    const { data, error } = await db.rpc("read_boardgame", { p_board: id, p_actor: actor?.id ?? null });
    if (error) throw new Error(error.message);
    const board = data as BoardRow | null;
    if (!board) throw new Error("접근할 수 없는 보드입니다.");
    const snapshot=decodeBoard(board);
    const ids = [...new Set(snapshot.tiles.map(tile => tile.action.params?.drawingId)
      .filter((id): id is string => typeof id === "string"))];
    snapshot.drawings = await readBoardDrawings(db, ids, actor?.id);
    const versions = new Map(snapshot.drawings.map(row => [row.id, row.version]));
    for (const tile of snapshot.tiles) {
      const drawingId = tile.action.params?.drawingId;
      if (typeof drawingId === "string") {
        tile.action.params = { ...tile.action.params, drawingVersion: versions.get(drawingId) ?? 0 };
      }
    }
    return snapshot;
  });
}

export async function createBoardgame(input: {name: string; gridRows: number; gridCols: number}) {
  return boardResult(async (): Promise<CreatedBoard> => {
    const board = await gameRpc<Omit<CreatedBoard, "is_owner" | "can_edit" | "can_manage">>("create_boardgame", {
      p_name: input.name.trim(), p_rows: input.gridRows, p_cols: input.gridCols,
    });
    return { ...board, is_owner: true, can_edit: true, can_manage: true };
  });
}

export async function deleteBoardgame(id: string) {
  return boardResult(async () => {
    await gameRpc("manage_boardgame", { p_board: id });
    const { error } = await sessionDatabase().from("boardgames").delete().eq("id",id);
    if (error) throw new Error(error.message);
    return null;
  });
}
