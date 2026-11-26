import { useRef, useState } from "react";
import type { Brush, Point } from "../types";
import { paint, fill } from "../utils/paint";

type Selection = Point & { width: number; height: number };
export type ResizeDirection = { x: -1 | 0 | 1; y: -1 | 0 | 1 };

function pixelOffset(start: Point, end: Point) {
  return {
    x: Math.floor(end.x) - Math.floor(start.x),
    y: Math.floor(end.y) - Math.floor(start.y),
  };
}

function selectionBounds(start: Point, end: Point): Selection {
  const offset = pixelOffset(start, end);
  return {
    x: Math.floor(Math.min(start.x, end.x)),
    y: Math.floor(Math.min(start.y, end.y)),
    width: Math.abs(offset.x) + 1,
    height: Math.abs(offset.y) + 1,
  };
}

export function useDrawingCanvas(brush: Brush, pickColor: (color: string) => void) {
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
  const selection = useRef<Selection | null>(null);
  const resize = useRef<{
    start: Point;
    direction: ResizeDirection;
    original: Selection;
    preview: Selection;
    base: ImageData;
    pixels: HTMLCanvasElement;
  } | null>(null);
  const curve = useRef<{
    a: Point;
    b?: Point;
    base: ImageData;
  } | null>(null);
  const [selectionBox, setSelectionBox] = useState<Selection | null>(null);
  const [dirty, setDirty] = useState(false),
    [, render] = useState(0);
  function reset() {
    history.current = [];
    future.current = [];
    gesture.current = null;
    resize.current = null;
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
    if (!ctx || resize.current || gesture.current) return;
    if (cancelCurve() && !redo) return;
    const source = redo ? future : history,
      dest = redo ? history : future;
    const image = source.current.pop();
    if (!image) return;
    dest.current.push(
      ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
    );
    ctx.putImageData(image, 0, 0);
    selection.current = null;
    setSelectionBox(null);
    canvas.current?.dispatchEvent(new Event("drawing-change"));
    setDirty(true);
    render((n) => n + 1);
  }
  function copyPixels() {
    const source = canvas.current;
    if (!source || gesture.current || resize.current) return null;
    const area = brush.tool === "select" ? selection.current : null;
    const x = Math.max(0, Math.floor(area?.x ?? 0));
    const y = Math.max(0, Math.floor(area?.y ?? 0));
    const right = Math.min(source.width, area ? Math.ceil(area.x + area.width) : source.width);
    const bottom = Math.min(source.height, area ? Math.ceil(area.y + area.height) : source.height);
    if (right <= x || bottom <= y) return null;

    const image = document.createElement("canvas");
    image.width = right - x;
    image.height = bottom - y;
    const ctx = image.getContext("2d")!;
    if (curve.current) {
      ctx.putImageData(curve.current.base, 0, 0);
    } else {
      ctx.drawImage(
        source, x, y, image.width, image.height,
        0, 0, image.width, image.height,
      );
    }
    return image;
  }
  function pastePixels(image: HTMLCanvasElement | ImageBitmap) {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || gesture.current || resize.current || !image.width || !image.height) return false;
    cancelCurve();
    const { width, height } = ctx.canvas;
    const pastedWidth = Math.min(width, image.width);
    const pastedHeight = Math.min(height, image.height);
    const area = {
      x: Math.floor((width - pastedWidth) / 2),
      y: Math.floor((height - pastedHeight) / 2),
      width: pastedWidth,
      height: pastedHeight,
    };

    checkpoint(ctx.getImageData(0, 0, width, height));
    ctx.drawImage(
      image,
      Math.floor((image.width - pastedWidth) / 2),
      Math.floor((image.height - pastedHeight) / 2),
      area.width, area.height,
      area.x, area.y, area.width, area.height,
    );
    selection.current = area;
    setSelectionBox(area);
    lastTool.current = "select";
    ctx.canvas.dispatchEvent(new Event("drawing-change"));
    return true;
  }
  function startResize(start: Point, direction: ResizeDirection) {
    const ctx = canvas.current?.getContext("2d");
    const original = selection.current;
    if (!ctx || !original || gesture.current || resize.current || brush.tool !== "select") return false;

    const pixels = document.createElement("canvas");
    pixels.width = original.width;
    pixels.height = original.height;
    pixels.getContext("2d")!.putImageData(
      ctx.getImageData(original.x, original.y, original.width, original.height),
      0, 0,
    );
    resize.current = {
      start,
      direction,
      original,
      preview: original,
      base: ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height),
      pixels,
    };
    return true;
  }
  function previewResize(point: Point) {
    const ctx = canvas.current?.getContext("2d");
    const active = resize.current;
    if (!ctx || !active) return;
    const { original, start, direction, base, pixels } = active;
    const offset = pixelOffset(start, point);
    const right = original.x + original.width;
    const bottom = original.y + original.height;
    const x = direction.x < 0
      ? Math.max(Math.min(0, original.x), Math.min(right - 1, original.x + offset.x))
      : original.x;
    const y = direction.y < 0
      ? Math.max(Math.min(0, original.y), Math.min(bottom - 1, original.y + offset.y))
      : original.y;
    const width = direction.x > 0
      ? Math.max(1, Math.min(Math.max(ctx.canvas.width, right) - x, original.width + offset.x))
      : right - x;
    const height = direction.y > 0
      ? Math.max(1, Math.min(Math.max(ctx.canvas.height, bottom) - y, original.height + offset.y))
      : bottom - y;
    const preview = width === original.width && height === original.height
      ? original
      : { x, y, width, height };

    ctx.putImageData(base, 0, 0);
    if (preview !== original) {
      ctx.clearRect(original.x, original.y, original.width, original.height);
      ctx.save();
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(pixels, x, y, width, height);
      ctx.restore();
    }
    active.preview = preview;
    setSelectionBox(preview);
    ctx.canvas.dispatchEvent(new Event("drawing-change"));
  }
  function finishResize(point?: Point) {
    const ctx = canvas.current?.getContext("2d");
    const active = resize.current;
    if (!ctx || !active) return;
    if (point) {
      previewResize(point);
      if (active.preview !== active.original) checkpoint(active.base);
      selection.current = active.preview;
    } else {
      ctx.putImageData(active.base, 0, 0);
      setSelectionBox(active.original);
      ctx.canvas.dispatchEvent(new Event("drawing-change"));
    }
    resize.current = null;
  }
  function changeTool(tool: Brush["tool"]) {
    if (lastTool.current === tool) return;
    cancelGesture();
    finishResize();
    cancelCurve();
    selection.current = null;
    setSelectionBox(null);
    lastTool.current = tool;
  }
  function down(p: Point) {
    if (resize.current || gesture.current) return;
    changeTool(brush.tool);

    const ctx = canvas.current?.getContext("2d");
    if (!ctx) return;
    if (brush.tool === "eyedropper") {
      const [r, g, b, alpha] = ctx.getImageData(Math.floor(p.x), Math.floor(p.y), 1, 1).data;
      if (alpha) {
        const hex = [r, g, b].map((channel) => channel.toString(16).padStart(2, "0")).join("");
        pickColor("#" + hex);
      }
      return;
    }
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
      ctx.canvas.dispatchEvent(new Event("drawing-change"));
    }
    if (brush.tool === "pen" || brush.tool === "eraser") {
      paint(ctx, brush, p, { x: p.x + 0.01, y: p.y + 0.01 });
      ctx.canvas.dispatchEvent(new Event("drawing-change"));
    }
  }
  function move(p: Point) {
    const ctx = canvas.current?.getContext("2d"),
      g = gesture.current;
    if (!ctx || !g) return;
    if (brush.tool === "pen" || brush.tool === "eraser") {
      if (g.last.x === p.x && g.last.y === p.y) return;
      paint(ctx, brush, g.last, p);
    } else {
      ctx.putImageData(g.base, 0, 0);
      if (g.selection && selection.current) {
        const offset = pixelOffset(g.start, p);
        const { x, y, width, height } = selection.current;
        if (offset.x || offset.y) {
          ctx.clearRect(x, y, width, height);
          ctx.putImageData(g.selection, x + offset.x, y + offset.y);
        }
        setSelectionBox({ x: x + offset.x, y: y + offset.y, width, height });
      } else if (brush.tool === "select") {
        setSelectionBox(selectionBounds(g.start, p));
      } else if (brush.tool === "curve") {
        const c = curve.current;
        if (c?.b) {
          ctx.putImageData(c.base, 0, 0);
          ctx.save();
          ctx.strokeStyle = brush.color;
          ctx.globalAlpha = brush.alpha;
          ctx.lineWidth = brush.width;
          ctx.lineCap = "round";
          ctx.beginPath();
          ctx.moveTo(c.a.x, c.a.y);
          ctx.quadraticCurveTo(p.x, p.y, c.b.x, c.b.y);
          ctx.stroke();
          ctx.restore();
        } else if (c) {
          paint(ctx, brush, c.a, p);
        }
      } else {
        paint(ctx, brush, g.start, p);
      }
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
      if (g.selection && selection.current) {
        const offset = pixelOffset(g.start, p);
        if (offset.x || offset.y) checkpoint(g.base);
        selection.current.x += offset.x;
        selection.current.y += offset.y;
      } else {
        selection.current = selectionBounds(g.start, p);
      }
      setSelectionBox({ ...selection.current });
    } else if (brush.tool === "curve") {
      const c = curve.current;
      if (!c) {
        curve.current = { a: p, base: g.base };
      } else if (!c.b) {
        c.b = p;
      } else {
        checkpoint(c.base);
        curve.current = null;
      }
    } else {
      checkpoint(g.base);
    }
    gesture.current = null;
  }
  function cancelGesture() {
    const ctx = canvas.current?.getContext("2d");
    const active = gesture.current;
    if (!ctx || !active) return;
    gesture.current = null;
    ctx.putImageData(active.base, 0, 0);
    setSelectionBox(selection.current);
    ctx.canvas.dispatchEvent(new Event("drawing-change"));
  }
  function cancelCurve() {
    const ctx = canvas.current?.getContext("2d");
    const pending = curve.current;
    if (!ctx || !pending) return false;
    curve.current = null;
    ctx.putImageData(pending.base, 0, 0);
    ctx.canvas.dispatchEvent(new Event("drawing-change"));
    return true;
  }
  return {
    selectionBox,
    canvas,
    dirty,
    reset,
    undo,
    copyPixels,
    pastePixels,
    startResize,
    previewResize,
    finishResize,
    changeTool,
    down,
    move,
    up,
    cancelGesture,
    cancelCurve,
    clear: () => {
      const ctx = canvas.current?.getContext("2d");
      if (ctx && !resize.current && !gesture.current) {
        cancelCurve();
        checkpoint(ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height));
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        selection.current = null;
        setSelectionBox(null);
        canvas.current?.dispatchEvent(new Event("drawing-change"));
      }
    },
  };
}
