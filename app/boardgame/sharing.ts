"use server";
import { gameRpc } from "@/server/game-rpc";
import { boardResult } from "./server/result";
import type { ShareKind, ShareReceipt } from "./types/session";

export async function sharedWith(id: string) {
  return boardResult(() => gameRpc<ShareReceipt[]>("list_boardgame_grants", { p_board: id }));
}
export async function share(id: string, kind: ShareKind, value: string, permission: string) {
  return boardResult(() => gameRpc<string>("share_boardgame", { p_board:id,p_kind:kind,p_value:value,p_permission:permission }));
}
export async function revoke(id: string, receipt: string) {
  return boardResult(() => gameRpc<null>("revoke_boardgame_grant", {p_board:id,p_receipt:receipt}));
}
export async function setVisibility(id: string, isPublic: boolean) {
  return boardResult(() => gameRpc<null>("set_boardgame_visibility",{p_board:id,p_public:isPublic}));
}
