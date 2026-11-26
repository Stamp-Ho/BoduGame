import { connection } from "next/server";
import { changeStream } from "@/server/realtime/stream";

export const maxDuration = 60;

export async function GET(request: Request) {
  await connection();
  return changeStream(request, [
    "boardgames", "boardgame_grants", "boardgame_tiles",
    "boardgame_tile_next", "boardgame_gold_cards",
  ]);
}
