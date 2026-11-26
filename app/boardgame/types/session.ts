import type { BoardTileData } from "./board";
import type { GoldCardData } from "../gold-cards/types";
import type { BoardDrawing } from "../drawing/types";
export type BoardgameResult<T> = { success: true; data: T } | { success: false; message: string; code?: string };
export type BoardgameSummary = {
  id: string; name: string; can_edit: boolean; can_manage: boolean; is_public: boolean; is_owner: boolean;
};
export type CreatedBoard = BoardgameSummary & { grid_rows: number; grid_cols: number };
export type BoardgameSnapshot = {
  id: string; name: string; grid_rows: number; grid_cols: number; tiles: BoardTileData[]; gold_cards: GoldCardData[]; drawings: BoardDrawing[];
};
export type ShareReceipt = { receipt: string; created_at: string; permission: string; nickname: string | null };
export type ShareKind = "nickname" | "real_name" | "email";
