import { useRef, useState } from "react";
import type { Brush, Point } from "../types";
import { paint, fill } from "../utils/paint";
export function useDrawingCanvas(brush: Brush) {
  const lastTool = useRef(brush.tool);
  const canvas = useRef<HTMLCanvasElement>(null),
    history = useRef<ImageData[]>([]),
    future = useRef<ImageData[]>([]);
  const gesture = useRef<{
    start: Point;
    last: Point;
    base: ImageData;
    selection?: ImageData;
  } | null>(null);
  const selection = useRef<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const curve = useRef<{
    a: Point;
    b: Point;
    base: ImageData;
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<{
    x: number;
    y: number;
    width: number;
    height: number;
  } | null>(null);
  const [dirty, setDirty] = useState(false),
    [, render] = useState(0);
  function reset() {
    history.current = [];
    future.current = [];
    gesture.current = null;
    curve.current = null;
    selection.current = null;
    setSelectionBox(null);
    setDirty(false);
    render((n) => n + 1);
  }
  function checkpoint(image: ImageData) {
    history.current.push(image);
    if (history.current.length > 30) history.current.shift();
    future.current = [];
    setDirty(true);
    render((n) => n + 1);
  }
  function undo(redo = false) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const source = redo ? future : history,
      dest = redo ? history : future;
    const image = source.current.pop();
    if (!image) return;
    dest.current.push(
      ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
    );
    ctx.putImageData(image, 0, 0);
    canvas.current?.dispatchEvent(new Event("drawing-change"));
    setDirty(true);
    render((n) => n + 1);
  }
  function down(p: Point) {
    if (lastTool.current !== brush.tool) {
      curve.current = null;
      selection.current = null;
      setSelectionBox(null);
      lastTool.current = brush.tool;
    }

    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    const base = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    gesture.current = { start: p, last: p, base };
    if (brush.tool === "select" && selection.current) {
      const r = selection.current;
      if (
        p.x >= r.x &&
        p.x < r.x + r.width &&
        p.y >= r.y &&
        p.y < r.y + r.height
      ) {
        gesture.current.selection = ctx.getImageData(
          r.x,
          r.y,
          r.width,
          r.height,
        );
        ctx.clearRect(r.x, r.y, r.width, r.height);
        gesture.current.base = ctx.getImageData(
          0,
          0,
          ctx.canvas.width,
          ctx.canvas.height,
        );
        checkpoint(base);
      }
    }
    if (brush.tool !== "select") {
      selection.current = null;
      setSelectionBox(null);
    }
    if (brush.tool === "fill") {
      fill(ctx, p, brush.color, brush.alpha);
      checkpoint(base);
      gesture.current = null;
    }
    if (brush.tool === "pen" || brush.tool === "eraser")
      paint(ctx, brush, p, { x: p.x + 0.01, y: p.y + 0.01 });
  }
  function move(p: Point) {
    const ctx = canvas.current?.getContext("2d"),
      g = gesture.current;
    if (!ctx || !g) return;
    if (["pen", "eraser"].includes(brush.tool)) paint(ctx, brush, g.last, p);
    else {
      ctx.putImageData(g.base, 0, 0);
      if (g.selection)
        ctx.putImageData(
          g.selection,
          p.x - g.start.x + selection.current!.x,
          p.y - g.start.y + selection.current!.y,
        );
      else if (brush.tool === "curve" && curve.current) {
        const c = curve.current;
        ctx.strokeStyle = brush.color;
        ctx.globalAlpha = brush.alpha;
        ctx.lineWidth = brush.width;
        ctx.beginPath();
        ctx.moveTo(c.a.x, c.a.y);
        ctx.quadraticCurveTo(p.x, p.y, c.b.x, c.b.y);
        ctx.stroke();
        ctx.globalAlpha = 1;
      } else if (!["select", "curve"].includes(brush.tool))
        paint(ctx, brush, g.start, p);
    }
    g.last = p;
    canvas.current?.dispatchEvent(new Event("drawing-change"));
  }
  function up(p: Point) {
    const ctx = canvas.current?.getContext("2d"),
      g = gesture.current;
    if (!ctx || !g) return;
    move(p);
    if (brush.tool === "select") {
      if (!g.selection)
        selection.current = {
          x: Math.floor(Math.min(p.x, g.start.x)),
          y: Math.floor(Math.min(p.y, g.start.y)),
          width: Math.max(1, Math.floor(Math.abs(p.x - g.start.x))),
          height: Math.max(1, Math.floor(Math.abs(p.y - g.start.y))),
        };
      else {
        selection.current!.x += p.x - g.start.x;
        selection.current!.y += p.y - g.start.y;
      }
      setSelectionBox({ ...selection.current! });
    } else if (brush.tool === "curve" && !curve.current) {
      curve.current = { a: g.start, b: p, base: g.base };
    } else {
      checkpoint(curve.current?.base ?? g.base);
      curve.current = null;
    }
    gesture.current = null;
  }
  return {
    selectionBox,
    canvas,
    dirty,
    reset,
    undo,
    down,
    move,
    up,
    clear: () => {
      const ctx = canvas.current?.getContext("2d");
      if (ctx) {
        checkpoint(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        canvas.current?.dispatchEvent(new Event("drawing-change"));
      }
    },
  };
}
