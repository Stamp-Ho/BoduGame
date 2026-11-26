export type Drawing = {
  id: string;
  owner_id: string;
  name: string;
  width: number;
  height: number;
  version: number;
  path: string;
};
export type Tool =
  "pen" | "eraser" | "fill" | "select" | "line" | "curve" | "rect" | "ellipse";
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
