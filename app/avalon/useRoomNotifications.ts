import { useEffect, useRef, useState } from "react";
import type { Phase } from "./rules";
import { showGameNotification, type View } from "./room-ui";

export function useRoomNotifications(roomId: string, view: View | null) {
  const [notificationFeedback, setNotificationFeedback] = useState("");
  const previousRoomPhase = useRef<{ roomId: string; phase: Phase } | null>(
    null,
  );
  const originalTitle = useRef<string | null>(null);
  const lastAvalonTitle = useRef<string | null>(null);
  useEffect(() => {
    originalTitle.current = document.title;
    return () => {
      if (
        document.title === lastAvalonTitle.current &&
        originalTitle.current !== null
      ) {
        document.title = originalTitle.current;
      }
    };
  }, []);

  const lobbyPlayers = view?.phase === "lobby" ? view.players.length : null;
  const lobbyCapacity =
    view?.phase === "lobby" ? view.config.playerCount : null;
  useEffect(() => {
    if (!roomId || lobbyPlayers === null || lobbyCapacity === null) {
      if (
        lastAvalonTitle.current &&
        document.title === lastAvalonTitle.current &&
        originalTitle.current !== null
      ) {
        document.title = originalTitle.current;
      }
      lastAvalonTitle.current = null;
      return;
    }

    const title = `아발론 ${lobbyPlayers}/${lobbyCapacity}`;
    const setTitle = (value: string) => {
      document.title = value;
      lastAvalonTitle.current = value;
    };
    if (lobbyPlayers < lobbyCapacity) {
      setTitle(title);
      return;
    }

    let green = false;
    setTitle(`🔴 ${title}`);
    const timer = window.setInterval(() => {
      green = !green;
      setTitle(`${green ? "🟢" : "🔴"} ${title}`);
    }, 1000);
    return () => window.clearInterval(timer);
  }, [roomId, lobbyPlayers, lobbyCapacity]);

  useEffect(() => {
    const phase = view?.phase;
    const previous = previousRoomPhase.current;
    if (
      roomId &&
      phase &&
      previous?.roomId === roomId &&
      previous.phase === "lobby" &&
      phase !== "lobby"
    ) {
      showGameNotification(
        "AVALON 게임 시작",
        "게임이 시작되었습니다. 역할을 확인해 주세요.",
      );
    }
    previousRoomPhase.current = roomId && phase ? { roomId, phase } : null;
  }, [roomId, view?.phase]);

  async function enableGameNotification() {
    if (typeof Notification === "undefined") {
      setNotificationFeedback("이 브라우저는 OS 알림을 지원하지 않습니다.");
      return;
    }
    try {
      const permission =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      setNotificationFeedback(
        permission === "granted"
          ? "게임 알림이 켜졌습니다."
          : "알림이 차단되었습니다. 브라우저의 사이트 설정에서 허용해 주세요.",
      );
    } catch {
      setNotificationFeedback(
        "알림 권한을 요청하지 못했습니다. 브라우저 설정을 확인해 주세요.",
      );
    }
  }

  return { notificationFeedback, enableGameNotification };
}
