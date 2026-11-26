import { useEffect, useState } from "react";
import type { BoardDrawing, Brush } from "../types";
import type { BoardTileData } from "../../types/board";
import { loadDrawingImage } from "../utils/images";
import { useDrawingCanvas } from "./useDrawingCanvas";
import { setTileDrawing, type TileDrawingSession } from "../utils/session";
export function useDrawingPanel({
  tile,
  canEditTile,
  boardSize,
  onUpdate,
  onMessage,
}: {
  tile: BoardTileData;
  canEditTile: boolean;
  boardSize: { rows: number; cols: number };
  onUpdate: (tile: Partial<BoardTileData>) => void;
  onMessage: (message: string) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<BoardDrawing | null>(null),
    [height, setHeight] = useState(512);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(tile.label),
    [busy, setBusy] = useState(false),
    [imageEditable, setUnlocked] = useState(true);
  const unlocked = canEditTile && imageEditable;
  const [loading, setLoading] = useState(false);
  const [copy, setCopy] = useState(false);
  const [mode, setMode] = useState<"canvas" | "tile">("tile");
  const [brush, setBrush] = useState<Brush>({
    tool: "pen",
    color: "#ffffff",
    alpha: 1,
    width: 4,
    filled: false,
  });
  const {
    selectionBox, canvas, dirty, reset, undo, copyPixels, pastePixels: paste,
    startResize, previewResize, finishResize, changeTool, down, move, up, cancelGesture, cancelCurve, clear,
  } =
    useDrawingCanvas(brush, (color) => setBrush((current) => ({ ...current, color })));
  function pastePixels(image: HTMLCanvasElement | ImageBitmap) {
    if (paste(image)) setBrush((current) => ({ ...current, tool: "select" }));
  }
  useEffect(() => {
    const element = canvas.current;
    if (!editing || !element) return;
    const ctx = element.getContext("2d")!;
    ctx.clearRect(0, 0, 512, height);
    if (selected) {
      let active = true;
      void loadDrawingImage(selected.id, selected.version).then((img) => {
        if (active) {
          ctx.drawImage(img, 0, 0);
          setLoading(false);
          element.dispatchEvent(new Event("drawing-change"));
        }
      }).catch(() => {
        if (active) {
          setLoading(false);
          setUnlocked(false);
          onMessage("그림을 불러오지 못했습니다.");
        }
      });
      return () => {
        active = false;
      };
    }
  }, [editing, selected, height, canvas, onMessage]);
  useEffect(() => {
    if (!editing || mode !== "tile" || !canvas.current) return;
    const session: TileDrawingSession = {
      tileId: tile.id,
      revision: performance.now(),
      canvas: canvas.current,
      down: (point) => {
        if (unlocked && !busy && !loading) down(point);
      },
      move: (point) => {
        if (unlocked && !busy && !loading) move(point);
      },
      up: (point) => {
        if (unlocked && !busy && !loading) up(point);
      },
      cancel: cancelGesture,
    };
    const changed = () => {
      session.revision++;
    };
    session.canvas.addEventListener("drawing-change", changed);
    setTileDrawing(session);
    return () => {
      session.canvas.removeEventListener("drawing-change", changed);
      setTileDrawing(null);
    };
  });
  async function task(fn: () => Promise<void>) {
    setBusy(true);
    try {
      await fn();
    } catch (e) {
      onMessage(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  function canLeave() {
    return !dirty || window.confirm("저장하지 않은 그림을 버릴까요?");
  }
  function open(row: BoardDrawing | null) {
    if (!canLeave()) return;
    canvas.current
      ?.getContext("2d")
      ?.clearRect(0, 0, 512, canvas.current.height);
    const asCopy = row !== null && !row.canEdit;
    const outer = tile.category === "OUTER";
    const corner = (tile.gridR === 0 || tile.gridR === boardSize.rows - 1) &&
      (tile.gridC === 0 || tile.gridC === boardSize.cols - 1);
    setCopy(asCopy);
    setLoading(!!row);
    setSelected(row ? { ...row } : null);
    setHeight(row?.height ?? (outer && !corner ? 819 : 512));
    setName(row ? row.name + (asCopy ? " 복사" : "") : tile.label);
    setUnlocked(true);
    setEditing(true);
    reset();
  }
  function closeEditor(discard = false) {
    if (!discard && !canLeave()) return;
    setEditing(false);
    setSelected(null);
    reset();
  }
  function point(e: React.PointerEvent, clamp = true) {
    const r = canvas.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) * 512) / r.width;
    const y = ((e.clientY - r.top) * height) / r.height;
    if (!clamp) return { x, y };
    return {
      x: Math.max(0, Math.min(511, x)),
      y: Math.max(0, Math.min(height - 1, y)),
    };
  }
  function apply(row: Pick<BoardDrawing, "id" | "version">) {
    onUpdate({
      action: {
        ...tile.action,
        params: {
          ...tile.action.params,
          drawingId: row.id,
          drawingVersion: row.version,
        },
      },
    });
    onMessage("타일에 연결했습니다. 보드 편집 완료 시 연결이 저장됩니다.");
  }
  return {
    selected,
    setSelected,
    height,
    editing,
    name,
    setName,
    busy,
    unlocked,
    setUnlocked,
    loading,
    setLoading,
    copy,
    setCopy,
    mode,
    setMode,
    brush,
    setBrush: (next: Brush) => {
      changeTool(next.tool);
      setBrush(next);
    },
    selectionBox,
    canvas,
    reset,
    undo,
    copyPixels,
    pastePixels,
    startResize,
    previewResize,
    finishResize,
    down,
    move,
    up,
    cancelGesture,
    cancelCurve,
    clear,
    task,
    canLeave,
    open,
    closeEditor,
    point,
    apply,
  };
}
