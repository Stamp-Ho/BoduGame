import * as THREE from "three";
import { getTileDrawing, type TileDrawingSession } from "./session";
import { tileDrawingBounds } from "../../utils/board";
import type { Point } from "../types";
export function attachTileDrawing(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  meshes: Map<string, THREE.Mesh>,
) {
  let stroke: { id: number; session: TileDrawingSession; last: Point } | null = null;
  const ray = new THREE.Raycaster();
  function point(e: PointerEvent, session: TileDrawingSession, clamp: boolean) {
    const mesh = meshes.get(session.tileId);
    if (!mesh) return null;
    const rect = canvas.getBoundingClientRect();
    ray.setFromCamera(
      new THREE.Vector2(
        ((e.clientX - rect.left) / rect.width) * 2 - 1,
        (-(e.clientY - rect.top) / rect.height) * 2 + 1,
      ),
      camera,
    );
    const hit = ray
      .intersectObject(mesh)
      .find((h) => h.face?.materialIndex === 2);
    if (!hit?.uv) return null;
    const geometry = mesh.geometry as THREE.BoxGeometry;
    const textureHeight = Math.round(512 / (geometry.parameters.width / geometry.parameters.depth));
    const { width, height } = session.canvas;
    const bounds = tileDrawingBounds(textureHeight, width, height);
    const u = (hit.uv.x * 512 - bounds.x) / bounds.width;
    const v = ((1 - hit.uv.y) * textureHeight - bounds.y) / bounds.height;
    if (!clamp && (u < 0 || u > 1 || v < 0 || v > 1)) return null;
    return {
      x: Math.min(width - 1, Math.max(0, u * width)),
      y: Math.min(height - 1, Math.max(0, v * height)),
    };
  }
  function down(e: PointerEvent) {
    if (stroke || !e.isPrimary || e.button !== 0) return;
    const s = getTileDrawing();
    const p = s && point(e, s, false);
    if (!s || !p) return;
    e.preventDefault();
    stroke = { id: e.pointerId, session: s, last: p };
    canvas.setPointerCapture(e.pointerId);
    s.down(p);
  }
  function move(e: PointerEvent) {
    if (stroke?.id !== e.pointerId) return;
    const s = getTileDrawing();
    if (s?.canvas !== stroke.session.canvas || s.tileId !== stroke.session.tileId) return;
    const p = point(e, s, true);
    if (p) {
      stroke.last = p;
      s.move(p);
    }
  }
  function up(e: PointerEvent) {
    if (stroke?.id !== e.pointerId) return;
    const active = stroke;
    stroke = null;
    const s = getTileDrawing();
    if (s?.canvas === active.session.canvas && s.tileId === active.session.tileId) {
      s.up(point(e, s, true) ?? active.last);
    } else {
      active.session.cancel();
    }
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  function cancel(e: PointerEvent) {
    if (stroke?.id !== e.pointerId) return;
    stroke.session.cancel();
    stroke = null;
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("lostpointercapture", cancel);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("lostpointercapture", cancel);
    stroke?.session.cancel();
  };
}
