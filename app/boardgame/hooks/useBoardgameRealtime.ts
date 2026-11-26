import { useEffect,useEffectEvent,type RefObject } from "react";
import { getBoardgame,listBoardgames,type BoardgameSnapshot,type BoardgameSummary } from "../actions";

type PollOptions = {
  loadedSnapshot: RefObject<string>;
  isRollInProgress: () => boolean;
  activeBoardgameId: string | null; editModeRef: RefObject<boolean>;
  setBoardgames: (boards: BoardgameSummary[]) => void;
  onAccess: (board: BoardgameSummary) => void;
  onBoardgameReloaded: (board: BoardgameSnapshot) => void;
  onBoardgameReloadError: (message: string) => void;
  onActiveBoardgameDeleted: () => void;
};
export function useBoardgameRealtime(options: PollOptions) {
  const {activeBoardgameId, loadedSnapshot} = options;
  const update = useEffectEvent(async (isActive: () => boolean, previous: string) => {
    const boards = await listBoardgames();
    if (!isActive() || !boards.success) return previous;
    options.setBoardgames(boards.data);
    if (!activeBoardgameId) return "";
    const board = boards.data.find(b=>b.id===activeBoardgameId);
    if (!board) { options.onActiveBoardgameDeleted(); return ""; }
    options.onAccess(board);
    if (options.editModeRef.current) return "";
    if (options.isRollInProgress()) return previous;
    const result = await getBoardgame(activeBoardgameId);
    if (!isActive() || options.editModeRef.current || options.isRollInProgress()) return previous;
    if (!result.success) { options.onBoardgameReloadError(result.message); return previous; }
    const snapshot = JSON.stringify(result.data);
    if (previous !== snapshot) options.onBoardgameReloaded(result.data);
    return snapshot;
  });
  const deferred = useEffectEvent(() => options.editModeRef.current || options.isRollInProgress());
  const onFailure = useEffectEvent(() => options.onBoardgameReloadError("보드를 새로고침하지 못했습니다."));
  useEffect(()=>{
    let active = true, last = loadedSnapshot.current, running = false, dirty = false;
    let timer: ReturnType<typeof setTimeout>;
    const events = new EventSource("/boardgame/events");
    async function refresh() {
      dirty = true;
      if (running || document.hidden) return;
      running = true;
      try {
        while (active && dirty) {
          dirty = false;
          last = await update(()=>active,last);
          if (active && deferred()) {
            timer = setTimeout(refresh,500);
            break;
          }
        }
      } catch {
        if (active) { onFailure(); timer = setTimeout(refresh,2000); }
      } finally { running = false; }
    }
    const changed = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh,150);
    };
    events.addEventListener("ready",changed);
    events.addEventListener("change",changed);
    const visible = () => { if (!document.hidden) void refresh(); };
    document.addEventListener("visibilitychange",visible);
    return ()=>{
      active=false; clearTimeout(timer); events.close();
      document.removeEventListener("visibilitychange",visible);
    };
  },[activeBoardgameId, loadedSnapshot]);
}
