import "server-only";
import type { BoardgameResult } from "../types/session";
export async function boardResult<T>(task: () => Promise<T>): Promise<BoardgameResult<T>> {
  try { return { success: true, data: await task() }; }
  catch (e) { return { success: false, message: e instanceof Error ? e.message : "보드를 불러올 수 없습니다." }; }
}
