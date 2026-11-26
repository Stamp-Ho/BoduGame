import { currentPlayer } from "@/server/auth/session";
import { sessionDatabase } from "@/server/auth/config";
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const db = sessionDatabase(),
    actor = await currentPlayer(),
    id = params.get("id");
  const { data } = await db
    .from("boardgame_drawings")
    .select("*")
    .eq("id", id)
    .single();
  if (!data) return new Response(null, { status: 404 });
  let allowed = data.owner_id === actor?.id || actor?.role === "super_admin";
  if (!allowed) {
    const { data: tiles } = await db
      .from("boardgame_tiles")
      .select("boardgame_id")
      .eq("action_params->>drawingId", id);
    for (const board of tiles ?? []) {
      const { data: access } = await db.rpc("boardgame_access", {
        p_board: board.boardgame_id,
        p_actor: actor?.id ?? null,
      });
      if (access) {
        allowed = true;
        break;
      }
    }
  }
  if (!allowed) return new Response(null, { status: 403 });
  if (params.has("v") && params.get("v") !== String(data.version)) {
    return new Response(null, { status: 409 });
  }
  const { data: file, error } = await db.storage
    .from("boardgame-drawings")
    .download(data.path);
  if (error || !file) return new Response(null, { status: 404 });
  return new Response(file, {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, no-cache",
    },
  });
}
