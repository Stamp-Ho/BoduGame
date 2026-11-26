import "server-only";
import { sessionDatabase } from "@/server/auth/config";

export function changeStream(request: Request, tables: string[]) {
  const db = sessionDatabase();
  const encoder = new TextEncoder();
  let dispose = () => {};
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      let closed = false;
      const channel = db.channel("game-events-" + crypto.randomUUID());
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
      for (const table of tables) {
        channel.on("postgres_changes", {
          event: "*", schema: "public", table,
        }, () => emit("change"));
      }
      channel.subscribe(status => {
        if (status === "SUBSCRIBED") emit("ready");
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT") close();
      });
      controller.enqueue(encoder.encode("retry: 2000\n\n"));
      const heartbeat = setInterval(() => {
        if (!closed) controller.enqueue(encoder.encode(": heartbeat\n\n"));
      }, 15000);
      const expiry = setTimeout(close, 50000);
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
