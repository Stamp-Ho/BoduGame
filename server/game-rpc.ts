import "server-only";
import { sessionDatabase } from "./auth/config";
import { currentPlayer } from "./auth/session";

export async function requirePlayer() {
  const player = await currentPlayer();
  if (!player) throw new Error("로그인이 필요합니다.");
  return player;
}

export async function gameRpc<T>(name: string, params: Record<string, unknown>, guest = false) {
  const player = guest ? await currentPlayer() : await requirePlayer();
  const { data, error } = await sessionDatabase().rpc(name, { ...params, p_actor: player?.id ?? null });
  if (error) throw new Error(error.message);
  return data as T;
}
