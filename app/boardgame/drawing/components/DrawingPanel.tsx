"use client";
import { DrawingToolbar } from "./DrawingToolbar";
import {
  drawingUses,
  deleteDrawing,
  listDrawings,
  saveDrawing,
} from "../actions";
import { useDrawingPanel } from "../hooks/useDrawingPanel";
export function DrawingPanel(props: Parameters<typeof useDrawingPanel>[0]) {
  const {
    setMessage,
    rows,
    setRows,
    selected,
    setSelected,
    height,
    setHeight,
    name,
    setName,
    busy,
    message,
    unlocked,
    setUnlocked,
    loading,
    setLoading,
    uses,
    copy,
    setCopy,
    mode,
    setMode,
    brush,
    setBrush,
    selectionBox,
    canvas,
    reset,
    undo,
    down,
    move,
    up,
    clear,
    task,
    canLeave,
    open,
    point,
    apply,
  } = useDrawingPanel(props);
  const { tile, onClose } = props;
  return (
    <section className="space-y-4 p-1 text-sm text-slate-200">
      <div className="flex justify-between">
        <h2 className="text-lg font-bold">그림 관리</h2>
        <button
          type="button"
          onClick={() => {
            if (canLeave()) onClose();
          }}
        >
          타일 편집으로
        </button>
      </div>
      <p>
        {tile.label} · {tile.id}
      </p>
      <fieldset disabled={busy} className="space-y-3">
        <button type="button" onClick={() => open(null)}>
          새 그림
        </button>
        <ul className="max-h-40 space-y-2 overflow-auto">
          {rows.map((row) => (
            <li key={row.id} className="flex justify-between gap-2">
              <button type="button" onClick={() => open(row)}>
                {row.name} · {uses[row.id] ?? 0}곳 적용
                {tile.action.params?.drawingId === row.id
                  ? " · 현재 타일 적용"
                  : ""}
                {(uses[row.id] ?? 0) >
                (tile.action.params?.drawingId === row.id ? 1 : 0)
                  ? " · 다른 타일 사용 중"
                  : ""}
              </button>
              <button type="button" onClick={() => apply(row)}>
                적용
              </button>
            </li>
          ))}
        </ul>
        {selected && (
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() =>
                void task(async () => {
                  const uses = await drawingUses(selected.id);
                  setMessage(
                    "적용 위치: " +
                      (uses.map((u) => u.board + " / " + u.tile).join(", ") ||
                        "없음"),
                  );
                  if (
                    window.confirm(
                      uses.length + "개 타일에 적용된 원본을 수정할까요?",
                    )
                  )
                    setUnlocked(true);
                })
              }
            >
              사용 현황·원본 수정
            </button>
            <button
              type="button"
              onClick={() => {
                setCopy(true);
                setName(name + " 복사");
                setUnlocked(true);
              }}
            >
              복제 후 수정
            </button>
            <button
              type="button"
              onClick={() =>
                void task(async () => {
                  const uses = await drawingUses(selected.id);
                  if (
                    !window.confirm(
                      uses.length + "개 타일의 그림이 사라집니다. 삭제할까요?",
                    )
                  )
                    return;
                  await deleteDrawing(selected.id);
                  window.dispatchEvent(
                    new CustomEvent("boardgame-drawing-saved", {
                      detail: { id: selected.id, deleted: true },
                    }),
                  );
                  setRows(await listDrawings());
                  reset();
                  setSelected(null);
                  setUnlocked(true);
                })
              }
            >
              삭제
            </button>
          </div>
        )}
        <label>
          이름
          <input
            className="block w-full rounded bg-slate-950 p-2"
            value={name}
            maxLength={80}
            onChange={(e) => setName(e.target.value)}
          />
        </label>
        {!selected && (
          <select
            aria-label="그림 해상도"
            className="bg-slate-950 p-2"
            value={height}
            onChange={(e) => {
              if (canLeave()) {
                setHeight(Number(e.target.value));
                reset();
              }
            }}
          >
            <option value="512">512 × 512</option>
            <option value="819">512 × 819</option>
          </select>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={() => setMode("canvas")}>
            전용 그리기
          </button>
          <button type="button" onClick={() => setMode("tile")}>
            타일에 적용 후 그리기
          </button>
        </div>
        <fieldset disabled={!unlocked}>
          <DrawingToolbar
            brush={brush}
            set={setBrush}
            undo={undo}
            clear={clear}
          />
        </fieldset>
        <div className="relative">
          <canvas
            ref={canvas}
            width={512}
            height={height}
            className="w-full touch-none border border-slate-500 bg-slate-800"
            onPointerDown={(e) => {
              if (!unlocked) return;
              e.currentTarget.setPointerCapture(e.pointerId);
              down(point(e));
            }}
            onPointerMove={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId))
                move(point(e));
            }}
            onPointerUp={(e) => {
              if (e.currentTarget.hasPointerCapture(e.pointerId)) {
                up(point(e));
                e.currentTarget.releasePointerCapture(e.pointerId);
              }
            }}
          />
          {selectionBox && (
            <div
              className="pointer-events-none absolute border border-dashed border-sky-300"
              style={{
                left: (selectionBox.x / 512) * 100 + "%",
                top: (selectionBox.y / height) * 100 + "%",
                width: (selectionBox.width / 512) * 100 + "%",
                height: (selectionBox.height / height) * 100 + "%",
              }}
            />
          )}
        </div>
        {mode === "tile" && (
          <p className="text-xs">타일 위 그리기 모드가 선택되었습니다.</p>
        )}
        <button
          type="button"
          className="w-full rounded bg-indigo-600 p-2"
          disabled={!unlocked || busy || loading}
          onClick={() =>
            void task(async () => {
              const blob = await new Promise<Blob | null>((resolve) =>
                canvas.current!.toBlob(resolve, "image/png"),
              );
              if (!blob) throw new Error("그림 변환에 실패했습니다.");
              const form = new FormData();
              form.set("file", blob, "drawing.png");
              form.set("name", name);
              if (selected && !copy) {
                form.set("id", selected.id);
                form.set("version", String(selected.version));
              }
              const row = await saveDrawing(form);
              window.dispatchEvent(
                new CustomEvent("boardgame-drawing-saved", {
                  detail: { id: row.id, version: row.version },
                }),
              );
              setRows(await listDrawings());
              setCopy(false);
              setLoading(true);
              setSelected(row);
              reset();
              apply(row);
            })
          }
        >
          저장
        </button>
      </fieldset>
      <p role="status">{message}</p>
    </section>
  );
}
