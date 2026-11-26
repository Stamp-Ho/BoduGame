import type { BoardDrawing } from "../types";

type ImageEntry = { image: Promise<HTMLImageElement>; url?: string };
const images = new Map<string, ImageEntry>();

export function loadDrawingImage(id: string, version: number, savedBlob?: Blob) {
  const key = id + ":" + version;
  const cached = images.get(key);
  if (cached) return cached.image;

  const entry: ImageEntry = { image: Promise.resolve().then(async () => {
    let blob = savedBlob;
    if (!blob) {
      const response = await fetch(
        "/boardgame/drawing/image?" + new URLSearchParams({ id, v: String(version) }),
      );
      if (!response.ok) throw new Error("그림을 불러오지 못했습니다.");
      blob = await response.blob();
    }
    if (images.get(key) !== entry) throw new Error("그림 버전이 변경되었습니다.");
    const image = new Image();
    entry.url = URL.createObjectURL(blob);
    image.src = entry.url;
    await image.decode();
    return image;
  }).catch((error) => {
    if (images.get(key) === entry) images.delete(key);
    if (entry.url) URL.revokeObjectURL(entry.url);
    throw error;
  }) };
  images.set(key, entry);
  return entry.image;
}

export function preloadDrawingImages(drawings: BoardDrawing[]) {
  const keys = new Set(drawings.map(({ id, version }) => id + ":" + version));
  for (const [key, entry] of images) {
    if (keys.has(key)) continue;
    if (entry.url) URL.revokeObjectURL(entry.url);
    images.delete(key);
  }
  for (const { id, version } of drawings) {
    void loadDrawingImage(id, version).catch(() => {});
  }
}
