import * as THREE from "three";
import { getTileDrawing } from "./session";
export function attachTileDrawing(
  canvas: HTMLCanvasElement,
  camera: THREE.Camera,
  meshes: Map<string, THREE.Mesh>,
) {
  let painting = false;
  const ray = new THREE.Raycaster();
  function point(e: PointerEvent) {
    const session = getTileDrawing(),
      mesh = session && meshes.get(session.tileId);
    if (!session || !mesh) return null;
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
    return hit?.uv
      ? {
          x: Math.min(511, Math.max(0, hit.uv.x * 512)),
          y: Math.min(
            session.canvas.height - 1,
            Math.max(0, (1 - hit.uv.y) * session.canvas.height),
          ),
        }
      : null;
  }
  function down(e: PointerEvent) {
    const s = getTileDrawing(),
      p = point(e);
    if (!s || !p) return;
    e.preventDefault();
    painting = true;
    canvas.setPointerCapture(e.pointerId);
    s.down(p);
  }
  function move(e: PointerEvent) {
    const s = getTileDrawing(),
      p = point(e);
    if (painting && s && p) s.move(p);
  }
  function up(e: PointerEvent) {
    const s = getTileDrawing(),
      p = point(e);
    if (painting && s && p) s.up(p);
    painting = false;
    if (canvas.hasPointerCapture(e.pointerId))
      canvas.releasePointerCapture(e.pointerId);
  }
  canvas.addEventListener("pointerdown", down);
  canvas.addEventListener("pointermove", move);
  canvas.addEventListener("pointerup", up);
  canvas.addEventListener("pointercancel", up);
  return () => {
    canvas.removeEventListener("pointerdown", down);
    canvas.removeEventListener("pointermove", move);
    canvas.removeEventListener("pointerup", up);
    canvas.removeEventListener("pointercancel", up);
  };
}
