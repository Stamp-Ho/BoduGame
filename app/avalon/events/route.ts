import { sessionDatabase } from "@/server/auth/config";
import { currentPlayer } from "@/server/auth/session";

export const maxDuration = 60;

export async function GET(request: Request) {
  const player = await currentPlayer();
  const room = new URL(request.url).searchParams.get("room");
  const db = sessionDatabase();
  if (room) {
    if (!player) return new Response(null, { status: 401 });
    const { data, error } = await db.from("avalon_rooms").select("id")
      .eq("id", room).contains("state", { players: [{ id: player.id }] }).maybeSingle();
    if (error || !data) return new Response(null, { status: 403 });
  }
  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      let heartbeat: ReturnType<typeof setInterval>;
      let expiry: ReturnType<typeof setTimeout>;
      const channel = db.channel("avalon-events-" + crypto.randomUUID());
      const close = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        clearTimeout(expiry);
        request.signal.removeEventListener("abort", close);
        void db.removeChannel(channel);
        controller.close();
      };
      dispose = close;
      const emit = (event: string) => {
        if (!closed) controller.enqueue(encoder.encode("event: " + event + "\ndata: {}\n\n"));
      };
      // Only invalidation signals leave the server. Room contents are fetched
      // through the existing authenticated Server Actions.
      channel.on("postgres_changes", {
        event: "*", schema: "public", table: "avalon_room_signals",
      }, payload => {
        const row = payload.eventType === "DELETE" ? payload.old : payload.new;
        if (!room || row.room_id === room) emit("change");
      }).subscribe(status => {
        if (status === "SUBSCRIBED") emit("ready");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") close();
      });
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
      expiry = setTimeout(close, 50000);
      request.signal.addEventListener("abort", close, { once: true });
      if (request.signal.aborted) close();
    },
    cancel() { dispose(); },
  });
  return new Response(stream, { headers: {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache, no-transform",
    "X-Accel-Buffering": "no",
  } });
}
