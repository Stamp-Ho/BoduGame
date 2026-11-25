import {
  useCallback,
  useRef,
  type Dispatch,
  type RefObject,
  type SetStateAction,
} from "react";
import { BoardTileData } from "../types/board";
import {
  getBoardgame,
  listBoardgames,
  type BoardgameSnapshot,
  type BoardgameSummary,
  deleteBoardgame,
} from "../actions";
import { GoldCardData } from "../gold-cards/types";
import { ArenaRuntime, OrbitSnapshot } from "../types/arena";
import { snapshotOrbit } from "../utils/arenaControls";
import { DEFAULT_TEAM_NAMES } from "../utils/arena";
import { useBoardgameRealtime } from "./useBoardgameRealtime";
import { restoreGameProgress } from "../utils/gameProgress";

export interface BoardgameSessionParams {
  boardgames: BoardgameSummary[];
  setBoardgames: Dispatch<SetStateAction<BoardgameSummary[]>>;
  activeBoardgameId: string | null;
  setActiveBoardgameId: Dispatch<SetStateAction<string | null>>;
  setActiveBoardgameCanEdit: Dispatch<SetStateAction<boolean>>;
  setIsBoardgameBusy: Dispatch<SetStateAction<boolean>>;
  setBoardgameStatus: Dispatch<SetStateAction<string>>;
  setBoardRefreshKey: Dispatch<SetStateAction<number>>;
  applyServerGridSize: (rows: number, cols: number) => void;
  setBoardTilesMap: Dispatch<SetStateAction<Map<string, BoardTileData>>>;
  setGoldCards: Dispatch<SetStateAction<GoldCardData[]>>;
  persistedGoldCardsRef: RefObject<string>;
  setGoldCardDrawPile: Dispatch<SetStateAction<string[]>>;
  setIsEditMode: Dispatch<SetStateAction<boolean>>;
  editModeRef: RefObject<boolean>;
  setSelectedTileId: Dispatch<SetStateAction<string | null>>;
  selectedTileIdRef: RefObject<string | null>;
  orbitSnapshotRef: RefObject<OrbitSnapshot | null>;
  cameraViewRestoreRef: RefObject<OrbitSnapshot | null>;
  runtimeRef: RefObject<ArenaRuntime | null>;
  loadedProgressBoardgameIdRef: RefObject<string | null>;
  resetTeamsToStart: (startTileId: string) => void;
  setTeamNames: Dispatch<SetStateAction<string[]>>;
  setTeamCount: (count: number) => void;
  teamPositionsRef: RefObject<number[]>;
  setTeamPositions: Dispatch<SetStateAction<number[]>>;
  teamTileIdsRef: RefObject<string[]>;
  setTeamTileIds: Dispatch<SetStateAction<string[]>>;
  currentTeamIndexRef: RefObject<number>;
  setCurrentTeamIndex: Dispatch<SetStateAction<number>>;
  teamSkipTurnsRef: RefObject<number[]>;
  setTeamSkipTurns: Dispatch<SetStateAction<number[]>>;
  playerTileIndexRef: RefObject<number>;
  setPlayerTileIndex: Dispatch<SetStateAction<number>>;
  hasRolledThisGameRef: RefObject<boolean>;
  setHasRolledThisGame: Dispatch<SetStateAction<boolean>>;
  setScores: Dispatch<SetStateAction<number[]>>;
}

/**
 * 보드게임 목록·선택 세션: 목록 새로고침, 불러오기(진행 상태 복원 포함), 새로 만든 보드게임 적용,
 * 편집 권한 부여·회수, 다른 사용자의 변경·삭제를 Realtime으로 반영.
 */
export function useBoardgameSession({
  boardgames,
  setBoardgames,
  activeBoardgameId,
  setActiveBoardgameId,
  setActiveBoardgameCanEdit,
  setIsBoardgameBusy,
  setBoardgameStatus,
  setBoardRefreshKey,
  applyServerGridSize,
  setBoardTilesMap,
  setGoldCards,
  persistedGoldCardsRef,
  setGoldCardDrawPile,
  setIsEditMode,
  editModeRef,
  setSelectedTileId,
  selectedTileIdRef,
  orbitSnapshotRef,
  cameraViewRestoreRef,
  runtimeRef,
  loadedProgressBoardgameIdRef,
  resetTeamsToStart,
  setTeamNames,
  setTeamCount,
  teamPositionsRef,
  setTeamPositions,
  teamTileIdsRef,
  setTeamTileIds,
  currentTeamIndexRef,
  setCurrentTeamIndex,
  teamSkipTurnsRef,
  setTeamSkipTurns,
  playerTileIndexRef,
  setPlayerTileIndex,
  hasRolledThisGameRef,
  setHasRolledThisGame,
  setScores,
}: BoardgameSessionParams) {
  const loadedSnapshot = useRef("");
  const refreshBoardgameList = useCallback(async () => {
    const result = await listBoardgames();
    if (result.success) setBoardgames(result.data);
    else setBoardgameStatus(result.message);
  }, [setBoardgameStatus, setBoardgames]);

  const applyReloadedBoardgame = (game: BoardgameSnapshot) => {
    const currentOrbit = runtimeRef.current?.orbit;
    if (currentOrbit) {
      cameraViewRestoreRef.current = snapshotOrbit(currentOrbit);
    }

    const tiles = new Map(game.tiles.map((tile) => [tile.id, tile]));
    if (selectedTileIdRef.current && !tiles.has(selectedTileIdRef.current)) {
      selectedTileIdRef.current = null;
      setSelectedTileId(null);
      orbitSnapshotRef.current = null;
    }
    applyServerGridSize(game.grid_rows, game.grid_cols);
    setBoardTilesMap(tiles);
    setGoldCards(game.gold_cards);
    persistedGoldCardsRef.current = JSON.stringify(game.gold_cards);
    setGoldCardDrawPile([]);
    setBoardRefreshKey((current) => current + 1);
    setBoardgameStatus("다른 사용자의 변경 사항을 반영했습니다.");
  };

  const clearDeletedActiveBoardgame = () => {
    editModeRef.current = false;
    setIsEditMode(false);
    const orbit = runtimeRef.current?.orbit;
    if (orbit) {
      cameraViewRestoreRef.current = snapshotOrbit(orbit);
    }
    setActiveBoardgameId(null);
    loadedProgressBoardgameIdRef.current = null;
    setActiveBoardgameCanEdit(false);
    setBoardTilesMap(new Map());
    setGoldCards([]);
    setSelectedTileId(null);
    selectedTileIdRef.current = null;
    orbitSnapshotRef.current = null;
    setBoardRefreshKey((current) => current + 1);
    setBoardgameStatus("이 보드는 더 이상 열 수 없습니다.");
  };

  useBoardgameRealtime({
    isRollInProgress: () => Boolean(runtimeRef.current?.orbit.preRollView),
    loadedSnapshot,
    activeBoardgameId,
    editModeRef,
    onBoardgameReloaded: applyReloadedBoardgame,
    onAccess: (board) => {
      setActiveBoardgameCanEdit(board.can_edit);
      if (!board.can_edit && editModeRef.current) {
        editModeRef.current = false;
        setIsEditMode(false);
      }
    },
    setBoardgames,
    onBoardgameReloadError: setBoardgameStatus,
    onActiveBoardgameDeleted: clearDeletedActiveBoardgame,
  });

  const handleLoadBoardgame = async (boardgameId: string | null) => {
    if (!boardgameId) {
      loadedProgressBoardgameIdRef.current = null;
      editModeRef.current = false;
      setIsEditMode(false);
      selectedTileIdRef.current = null;
      orbitSnapshotRef.current = null;
      cameraViewRestoreRef.current = null;
      setActiveBoardgameId(null);
      setActiveBoardgameCanEdit(false);
      setBoardTilesMap(new Map());
      setGoldCards([]);
      setGoldCardDrawPile([]);
      setSelectedTileId(null);
      setBoardRefreshKey((current) => current + 1);
      return;
    }

    setIsBoardgameBusy(true);
    setBoardgameStatus("게임을 불러오는 중…");
    const result = await getBoardgame(boardgameId);
    if (!result.success) {
      setBoardgameStatus(result.message);
      setIsBoardgameBusy(false);
      return;
    }

    const game = result.data;
    loadedSnapshot.current = JSON.stringify(game);
    const summary = boardgames.find((item) => item.id === game.id);
    const {
      teamCount,
      restoredTileIds,
      restoredPositions,
      restoredNames,
      restoredCurrentTeam,
      restoredScores,
      restoredHasRolled,
      restoredSkipTurns,
    } = restoreGameProgress(
      game.id,
      game.grid_rows,
      game.grid_cols,
      game.tiles,
    );
    selectedTileIdRef.current = null;
    orbitSnapshotRef.current = null;
    cameraViewRestoreRef.current = null;
    setActiveBoardgameId(game.id);
    loadedProgressBoardgameIdRef.current = game.id;
    editModeRef.current = false;
    setIsEditMode(false);
    setActiveBoardgameCanEdit(summary?.can_edit ?? false);
    applyServerGridSize(game.grid_rows, game.grid_cols);
    setBoardTilesMap(new Map(game.tiles.map((tile) => [tile.id, tile])));
    setGoldCards(game.gold_cards);
    persistedGoldCardsRef.current = JSON.stringify(game.gold_cards);
    setGoldCardDrawPile([]);
    setSelectedTileId(null);
    teamPositionsRef.current = restoredPositions;
    teamTileIdsRef.current = restoredTileIds;
    setTeamTileIds([...teamTileIdsRef.current]);
    setTeamPositions([...teamPositionsRef.current]);
    setTeamNames(restoredNames);
    setTeamCount(teamCount);
    setCurrentTeamIndex(restoredCurrentTeam);
    currentTeamIndexRef.current = restoredCurrentTeam;
    teamSkipTurnsRef.current = restoredSkipTurns;
    setTeamSkipTurns([...restoredSkipTurns]);
    setPlayerTileIndex(restoredPositions[restoredCurrentTeam] ?? 0);
    playerTileIndexRef.current = restoredPositions[restoredCurrentTeam] ?? 0;
    setHasRolledThisGame(restoredHasRolled);
    hasRolledThisGameRef.current = restoredHasRolled;
    setScores(restoredScores);
    setSelectedTileId(null);
    setBoardRefreshKey((current) => current + 1);
    setBoardgameStatus("게임을 불러왔습니다.");
    setIsBoardgameBusy(false);
  };

  const handleCreatedBoardgame = (
    game: import("../types/session").CreatedBoard,
  ) => {
    setBoardgames((current) => [
      game,
      ...current.filter((item) => item.id !== game.id),
    ]);
    setActiveBoardgameId(game.id);
    loadedProgressBoardgameIdRef.current = game.id;
    setActiveBoardgameCanEdit(true);
    applyServerGridSize(game.grid_rows, game.grid_cols);
    setBoardTilesMap(new Map());
    setGoldCards([]);
    setTeamNames(DEFAULT_TEAM_NAMES);
    setTeamCount(DEFAULT_TEAM_NAMES.length);
    resetTeamsToStart("outer_0");
    hasRolledThisGameRef.current = false;
    setHasRolledThisGame(false);
    persistedGoldCardsRef.current = "[]";
    setGoldCardDrawPile([]);
    setSelectedTileId(null);
    selectedTileIdRef.current = null;
    setBoardRefreshKey((current) => current + 1);
    setBoardgameStatus("보드게임이 생성되었습니다.");
  };

  const handleDeleteBoardgame = async () => {
    if (!activeBoardgameId) return;
    setIsBoardgameBusy(true);
    const result = await deleteBoardgame(activeBoardgameId);
    if (!result.success) {
      setBoardgameStatus(result.message);
      setIsBoardgameBusy(false);
      return;
    }
    clearDeletedActiveBoardgame();
    await refreshBoardgameList();
    setBoardgameStatus("보드게임을 삭제했습니다.");
    setIsBoardgameBusy(false);
  };

  return {
    refreshBoardgameList,
    handleLoadBoardgame,
    handleCreatedBoardgame,
    handleDeleteBoardgame,
  };
}
