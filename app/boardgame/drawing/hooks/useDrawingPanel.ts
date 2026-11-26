import { useEffect, useState } from "react";
import type { Brush, Drawing } from "../types";
import type { BoardTileData } from "../../types/board";
import { listDrawings, drawingUses } from "../actions";
import { useDrawingCanvas } from "./useDrawingCanvas";
import { setTileDrawing, type TileDrawingSession } from "../utils/session";
export function useDrawingPanel({
  tile,
  onUpdate,
}: {
  tile: BoardTileData;
  onUpdate: (tile: Partial<BoardTileData>) => void;
  onClose: () => void;
}) {
  const [rows, setRows] = useState<Drawing[]>([]),
    [selected, setSelected] = useState<Drawing | null>(null),
    [height, setHeight] = useState(512);
  const [name, setName] = useState("새 그림"),
    [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [unlocked, setUnlocked] = useState(true);
  const [loading, setLoading] = useState(false);
  const [uses, setUses] = useState<Record<string, number>>({});
  const [copy, setCopy] = useState(false);
  const [mode, setMode] = useState<"canvas" | "tile">("tile");
  const [brush, setBrush] = useState<Brush>({
    tool: "pen",
    color: "#ffffff",
    alpha: 1,
    width: 4,
    filled: false,
  });
  const { selectionBox, canvas, dirty, reset, undo, down, move, up, clear } =
    useDrawingCanvas(brush);
  useEffect(() => {
    let active = true;
    void listDrawings()
      .then((data) => {
        if (active) setRows(data);
        return Promise.all(
          data.map(
            async (row) =>
              [row.id, (await drawingUses(row.id)).length] as const,
          ),
        ).then((pairs) => {
          if (active) setUses(Object.fromEntries(pairs));
        });
      })
      .catch(() => {
        if (active) setMessage("그림을 불러오지 못했습니다.");
      });
    return () => {
      active = false;
    };
  }, []);
  useEffect(() => {
    const element = canvas.current;
    if (!element) return;
    const ctx = element.getContext("2d")!;
    ctx.clearRect(0, 0, 512, height);
    if (selected) {
      const img = new Image();
      let active = true;
      img.onload = () => {
        if (active) {
          ctx.drawImage(img, 0, 0);
          setLoading(false);
          element.dispatchEvent(new Event("drawing-change"));
        }
      };
      img.onerror = () => {
        if (active) {
          setLoading(false);
          setUnlocked(false);
          setMessage("그림을 불러오지 못했습니다.");
        }
      };
      img.src =
        "/boardgame/drawing/image?id=" + selected.id + "&v=" + selected.version;
      return () => {
        active = false;
      };
    }
  }, [selected, height, canvas]);
  useEffect(() => {
    if (mode !== "tile" || !canvas.current) return;
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
    setMessage("");
    try {
      await fn();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "요청에 실패했습니다.");
    } finally {
      setBusy(false);
    }
  }
  function canLeave() {
    return !dirty || window.confirm("저장하지 않은 그림을 버릴까요?");
  }
  function open(row: Drawing | null) {
    if (!canLeave()) return;
    canvas.current
      ?.getContext("2d")
      ?.clearRect(0, 0, 512, canvas.current.height);
    setCopy(false);
    setLoading(!!row);
    setSelected(row ? { ...row } : null);
    setHeight(row?.height ?? 512);
    setName(row?.name ?? "새 그림");
    setUnlocked(!row);
    reset();
  }
  function point(e: React.PointerEvent<HTMLCanvasElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(511, ((e.clientX - r.left) * 512) / r.width)),
      y: Math.max(
        0,
        Math.min(height - 1, ((e.clientY - r.top) * height) / r.height),
      ),
    };
  }
  function apply(row: Drawing) {
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
    setMessage("타일에 연결했습니다. 보드 편집 완료 시 연결이 저장됩니다.");
  }
  return {
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
  };
}
