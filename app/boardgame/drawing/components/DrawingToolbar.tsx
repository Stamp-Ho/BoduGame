import type { Brush, Tool } from "../types";
const tools: [Tool, string][] = [
  ["select", "범위 선택·이동"],
  ["eraser", "지우개"],
  ["fill", "채우기"],
  ["rect", "사각형"],
  ["ellipse", "원"],
  ["line", "직선"],
  ["curve", "곡선"],
  ["pen", "펜"],
];
export function DrawingToolbar({
  brush,
  set,
  undo,
  clear,
}: {
  brush: Brush;
  set: (b: Brush) => void;
  undo: (redo?: boolean) => void;
  clear: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {tools.map(([tool, label]) => (
          <button
            type="button"
            key={tool}
            aria-pressed={brush.tool === tool}
            className="rounded border border-slate-600 px-2 py-1 text-xs aria-pressed:bg-indigo-600"
            onClick={() => set({ ...brush, tool })}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-3">
        <label>
          색상{" "}
          <input
            aria-label="색상"
            type="color"
            value={brush.color}
            onChange={(e) => set({ ...brush, color: e.target.value })}
          />
        </label>
        <label>
          불투명도{" "}
          <input
            type="range"
            min="0"
            max="1"
            step=".01"
            value={brush.alpha}
            onChange={(e) => set({ ...brush, alpha: Number(e.target.value) })}
          />
          {Math.round(brush.alpha * 100)}%
        </label>
        <label>
          두께 {brush.width}px
          <input
            type="range"
            min="1"
            max="25"
            value={brush.width}
            onChange={(e) => set({ ...brush, width: Number(e.target.value) })}
          />
        </label>
        <label>
          <input
            type="checkbox"
            checked={brush.filled}
            onChange={(e) => set({ ...brush, filled: e.target.checked })}
          />
          도형 채우기
        </label>
      </div>
      <div className="flex gap-3">
        <button type="button" onClick={() => undo()}>
          실행 취소
        </button>
        <button type="button" onClick={() => undo(true)}>
          다시 실행
        </button>
        <button type="button" onClick={clear}>
          전체 지우기
        </button>
      </div>
      <p className="text-xs text-slate-400">
        {brush.tool === "curve"
          ? "끝점을 드래그한 뒤 다시 드래그해 곡률을 조절하세요."
          : brush.tool === "select"
            ? "사각형을 드래그해 선택한 뒤 내부를 끌어 이동하세요."
            : ""}
      </p>
    </div>
  );
}
