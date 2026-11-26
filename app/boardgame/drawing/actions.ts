"use server";
import { requirePlayer } from "@/server/game-rpc";
import { sessionDatabase } from "@/server/auth/config";
import type { Drawing } from "./types";
export async function saveDrawing(form: FormData) {
  const actor = await requirePlayer(),
    db = sessionDatabase();
  const id = String(form.get("id") || crypto.randomUUID()),
    version = Number(form.get("version") || 0);
  const file = form.get("file"),
    name = String(form.get("name") || "그림")
      .trim()
      .slice(0, 80);
  if (!(file instanceof File) || file.size > 1048576)
    throw new Error("그림은 1MB 이하여야 합니다.");
  if (!name) throw new Error("그림 이름을 입력해 주세요.");
  const bytes = Buffer.from(await file.arrayBuffer());
  if (
    bytes.length < 24 ||
    bytes.subarray(0, 8).toString("hex") !== "89504e470d0a1a0a" ||
    bytes.readUInt32BE(16) !== 512 ||
    ![512, 819].includes(bytes.readUInt32BE(20))
  )
    throw new Error("그림 형식 또는 해상도를 확인해 주세요.");
  let previousPath: string | null = null;
  if (version) {
    const { data } = await db
      .from("boardgame_drawings")
      .select("*")
      .eq("id", id)
      .eq("owner_id", actor.id)
      .eq("version", version)
      .single();
    if (!data) throw new Error("원본이 변경되었거나 수정 권한이 없습니다.");
    previousPath = data.path;
  }
  const path = actor.id + "/" + crypto.randomUUID() + ".png";
  const { error: upload } = await db.storage
    .from("boardgame-drawings")
    .upload(path, bytes, { contentType: "image/png" });
  if (upload) throw new Error("그림 업로드에 실패했습니다.");
  const values = {
    name,
    owner_id: actor.id,
    width: 512,
    height: bytes.readUInt32BE(20),
    path,
    version: version + 1,
  };
  const query = version
    ? db
        .from("boardgame_drawings")
        .update(values)
        .eq("id", id)
        .eq("owner_id", actor.id)
        .eq("version", version)
    : db.from("boardgame_drawings").insert({ id, ...values });
  const { data, error } = await query.select("*").single();
  if (error || !data) {
    await db.storage.from("boardgame-drawings").remove([path]);
    throw new Error("저장 충돌이 발생했습니다. 다시 불러와 주세요.");
  }
  if (previousPath)
    await db.storage.from("boardgame-drawings").remove([previousPath]);
  return data as Drawing;
}
export async function drawingUses(id: string) {
  const actor = await requirePlayer(),
    db = sessionDatabase();
  const { data: own } = await db
    .from("boardgame_drawings")
    .select("id")
    .eq("id", id)
    .eq("owner_id", actor.id)
    .single();
  if (!own) throw new Error("그림 권한이 없습니다.");
  const { data, error } = await db
    .from("boardgame_tiles")
    .select("id,boardgame_id")
    .eq("action_params->>drawingId", id);
  if (error) throw new Error("사용 현황을 확인하지 못했습니다.");
  return (data ?? []).map((row) => ({ tile: row.id, board: row.boardgame_id }));
}
export async function deleteDrawing(id: string) {
  const actor = await requirePlayer(),
    db = sessionDatabase();
  const { data, error } = await db
    .from("boardgame_drawings")
    .delete()
    .eq("id", id)
    .eq("owner_id", actor.id)
    .select("path")
    .single();
  if (error || !data) throw new Error("그림을 삭제하지 못했습니다.");
  await db.storage.from("boardgame-drawings").remove([data.path]);
}
