"use server";

import { gameRpc } from "@/server/game-rpc";
import { sessionDatabase } from "@/server/auth/config";
import { boardResult } from "./server/result";
import { decodeBoard, type BoardRow } from "./server/snapshot";
import type { BoardgameSummary, CreatedBoard } from "./types/session";
export type { BoardgameSummary, BoardgameSnapshot, BoardgameResult } from "./types/session";

export async function listBoardgames() {
  return boardResult(() => gameRpc<BoardgameSummary[]>("boardgame_catalog", {}, true));
}

export async function getBoardgame(id: string) {
  return boardResult(async () => {
    const board = await gameRpc<BoardRow | null>("read_boardgame", { p_board: id }, true);
    if (!board) throw new Error("접근할 수 없는 보드입니다.");
    const snapshot=decodeBoard(board);
    const ids=snapshot.tiles.map(tile=>tile.action.params?.drawingId).filter((id):id is string=>typeof id==="string");
    if(ids.length){
      const {data,error}=await sessionDatabase().from("boardgame_drawings").select("id,version").in("id",ids);
      if(error)throw new Error("그림 정보를 불러오지 못했습니다.");
      const versions=new Map((data??[]).map(row=>[row.id,row.version]));
      for(const tile of snapshot.tiles){const id=tile.action.params?.drawingId;if(typeof id==="string")tile.action.params={...tile.action.params,drawingVersion:versions.get(id)??0};}
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
