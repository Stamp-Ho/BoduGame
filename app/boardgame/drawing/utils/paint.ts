import type { Brush, Point } from "../types";
export function paint(
  ctx: CanvasRenderingContext2D,
  brush: Brush,
  a: Point,
  b: Point,
) {
  ctx.save();
  ctx.globalAlpha = brush.alpha;
  ctx.lineWidth = brush.width;
  ctx.strokeStyle = ctx.fillStyle = brush.color;
  ctx.lineCap = ctx.lineJoin = "round";
  ctx.globalCompositeOperation =
    brush.tool === "eraser" ? "destination-out" : "source-over";
  ctx.beginPath();
  if (brush.tool === "rect") ctx.rect(a.x, a.y, b.x - a.x, b.y - a.y);
  else if (brush.tool === "ellipse")
    ctx.ellipse(
      (a.x + b.x) / 2,
      (a.y + b.y) / 2,
      Math.abs(b.x - a.x) / 2,
      Math.abs(b.y - a.y) / 2,
      0,
      0,
      Math.PI * 2,
    );
  else {
    ctx.moveTo(a.x, a.y);
    ctx.lineTo(b.x, b.y);
  }
  if (brush.filled && ["rect", "ellipse"].includes(brush.tool)) ctx.fill();
  else ctx.stroke();
  ctx.restore();
}
export function fill(
  ctx: CanvasRenderingContext2D,
  point: Point,
  color: string,
  alpha: number,
) {
  const { width, height } = ctx.canvas,
    data = ctx.getImageData(0, 0, width, height),
    p = data.data;
  const start = (Math.floor(point.y) * width + Math.floor(point.x)) * 4,
    target = Array.from(p.slice(start, start + 4));
  const rgb = [
    parseInt(color.slice(1, 3), 16),
    parseInt(color.slice(3, 5), 16),
    parseInt(color.slice(5, 7), 16),
    Math.round(alpha * 255),
  ];
  const visited = new Uint8Array(width * height),
    stack = [start / 4];
  while (stack.length) {
    const i = stack.pop()!;
    if (i < 0 || i >= visited.length || visited[i]) continue;
    visited[i] = 1;
    if (!target.every((v, k) => Math.abs(p[i * 4 + k] - v) <= 16)) continue;
    rgb.forEach((v, k) => {
      p[i * 4 + k] = v;
    });
    if (i % width) stack.push(i - 1);
    if (i % width < width - 1) stack.push(i + 1);
    stack.push(i - width, i + width);
  }
  ctx.putImageData(data, 0, 0);
}
