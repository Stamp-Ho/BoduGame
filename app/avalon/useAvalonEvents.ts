"use client";
import { useEffect, useEffectEvent } from "react";

export function useAvalonEvents(roomId: string, busy: boolean, preview: boolean, refresh: () => Promise<void>) {
  const update = useEffectEvent(refresh);
  useEffect(() => {
    if (preview || busy) return;
    let active = true, running = false, dirty = false;
    const events = new EventSource("/avalon/events" + (roomId ? "?room=" + encodeURIComponent(roomId) : ""));
    let retry: ReturnType<typeof setTimeout>;
    async function receive() {
      dirty = true;
      if (running) return;
      running = true;
      try {
        while (active && dirty) {
          dirty = false;
          await update();
        }
      } catch {
        // EventSource reconnects and ready refreshes the complete snapshot.
        if (active) retry = setTimeout(receive, 2000);
      } finally { running = false; }
    }
    events.addEventListener("ready", receive);
    events.addEventListener("change", receive);
    return () => { active = false; clearTimeout(retry); events.close(); };
  }, [roomId, busy, preview]);
}
