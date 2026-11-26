"use client";

import { useEffect, useEffectEvent } from "react";

export function useRoomPolling(
  enabled: boolean,
  roomId: string,
  refresh: (isActive: () => boolean) => void,
) {
  const update = useEffectEvent(refresh);
  useEffect(() => {
    if (!enabled) return;
    let active = true;
    const timer = setInterval(() => {
      if (!document.hidden) update(() => active);
    }, roomId ? 5000 : 10000);
    return () => { active = false; clearInterval(timer); };
  }, [enabled, roomId]);
}
