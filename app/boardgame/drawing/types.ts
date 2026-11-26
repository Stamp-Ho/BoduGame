export type Drawing = {
  id: string;
  owner_id: string;
  name: string;
  width: number;
  height: number;
  version: number;
  path: string;
};
export type BoardDrawing = Pick<Drawing, "id" | "name" | "height" | "version"> & { canEdit: boolean };
export type Tool =
  "pen" | "eraser" | "fill" | "eyedropper" | "select" | "line" | "curve" | "rect" | "ellipse";
export type Point = {
  x: number;
  y: number;
};
export type Brush = {
  tool: Tool;
  color: string;
  alpha: number;
  width: number;
  filled: boolean;
};
