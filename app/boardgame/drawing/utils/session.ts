import type { Point } from "../types";
export type TileDrawingSession = {
  tileId: string;
  revision: number;
  canvas: HTMLCanvasElement;
  down: (p: Point) => void;
  move: (p: Point) => void;
  up: (p: Point) => void;
};
let active: TileDrawingSession | null = null;
export const getTileDrawing = () => active;
export function setTileDrawing(session: TileDrawingSession | null) {
  active = session;
}
