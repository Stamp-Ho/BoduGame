import "server-only";
import type { BoardgameSnapshot } from "../types/session";
import type { BoardTileData } from "../types/board";
import type { GoldCardData } from "../gold-cards/types";
type TileRow = {
  id: string; category: BoardTileData["category"]; grid_row: number; grid_col: number;
  label: string; sub_label: string; color?: string; text_color?: string; icon?: string;
  action_type: BoardTileData["action"]["type"]; action_params: BoardTileData["action"]["params"]; is_locked: boolean;
};
export type BoardRow = Omit<BoardgameSnapshot,"tiles"|"gold_cards"> & {
  tiles: TileRow[]; edges: { source_tile_id: string; target_tile_id: string }[];
  cards: { id: string; title: string; description: string; event_type: GoldCardData["event"]["type"]; event_params: object }[];
};
export function decodeBoard(row: BoardRow): BoardgameSnapshot {
  const edges = new Map<string,string[]>();
  for (const edge of row.edges) {
    const targets = edges.get(edge.source_tile_id) ?? [];
    targets.push(edge.target_tile_id);
    edges.set(edge.source_tile_id, targets);
  }
  return { id: row.id, name: row.name, grid_rows: row.grid_rows, grid_cols: row.grid_cols,
    tiles: row.tiles.map(t => ({
      id: t.id, category: t.category, gridR: t.grid_row, gridC: t.grid_col, position: { x: 0, y: 0.2, z: 0 },
      rotationY: 0, label: t.label, subLabel: t.sub_label, color: t.color, textColor: t.text_color, icon: t.icon,
      nextTileIds: edges.get(t.id) ?? [], action: { type: t.action_type, params: t.action_params }, isLocked: t.is_locked,
    })),
    gold_cards: row.cards.map(c => ({ id:c.id,title:c.title,description:c.description,
      event: { ...c.event_params,type:c.event_type } as GoldCardData["event"] })),
  };
}
