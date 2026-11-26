import "server-only";
import type { sessionDatabase } from "@/server/auth/config";
import type { BoardDrawing } from "../drawing/types";

export async function readBoardDrawings(db: ReturnType<typeof sessionDatabase>, ids: string[], actorId?: string): Promise<BoardDrawing[]> {
  const columns = "id,name,height,version,owner_id";
  const rows = new Map<string, {
    id: string; name: string; height: number; version: number; owner_id: string;
  }>();
  if (actorId) {
    const pageSize = 500;
    for (let offset = 0; ; offset += pageSize) {
      const { data, error } = await db
        .from("boardgame_drawings")
        .select(columns)
        .eq("owner_id", actorId)
        .order("id")
        .range(offset, offset + pageSize - 1);
      if (error) throw new Error("그림 목록을 불러오지 못했습니다.");
      for (const row of data ?? []) rows.set(row.id, row);
      if (!data || data.length < pageSize) break;
    }
  }
  const linkedIds = ids.filter((id) => !rows.has(id));
  for (let offset = 0; offset < linkedIds.length; offset += 100) {
    const { data, error: linkedError } = await db
      .from("boardgame_drawings")
      .select(columns)
      .in("id", linkedIds.slice(offset, offset + 100));
    if (linkedError) throw new Error("그림 목록을 불러오지 못했습니다.");
    for (const row of data ?? []) rows.set(row.id, row);
  }
  return [...rows.values()]
    .map(({ id, name, height, version, owner_id }) => ({
      id, name, height, version, canEdit: owner_id === actorId,
    }))
    .sort((a, b) => a.name.localeCompare(b.name, "ko"));
}
