'use client';

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { BoardTileData } from '../types/board';
import { listBoardgames, type BoardgameSummary } from '../actions';
import { GoldCardData } from '../gold-cards/types';
import { TileSelectionMode } from '../types/DiceArenaProps';
import { ArenaRuntime, OrbitSnapshot } from '../types/arena';
import { useBeforeUnloadWarning } from './useBeforeUnloadWarning';
import { useGameProgress } from './useGameProgress';
import { useArenaScene } from './useArenaScene';
import { useTileEditor } from './useTileEditor';
import { useBoardgameSession } from './useBoardgameSession';
import { useGamePlay } from './useGamePlay';
import { isInnerCellOccupied } from '../utils/boardTiles';

export function useDiceArena() {
	const containerRef = useRef<HTMLDivElement>(null);
	const canvasRef = useRef<HTMLCanvasElement>(null);

	// 보드 규격 설정 (M x N)
	const [boardSize, setBoardSize] = useState<{ rows: number; cols: number }>({
		rows: 8,
		cols: 10,
	});
	const [gridSizeDraft, setGridSizeDraft] = useState({
		rows: '8',
		cols: '10',
	});
	const [gridSizeError, setGridSizeError] = useState('');
	const [boardgames, setBoardgames] = useState<BoardgameSummary[]>([]);
	const [activeBoardgameId, setActiveBoardgameId] = useState<string | null>(
		null,
	);
	const [activeBoardgameCanEdit, setActiveBoardgameCanEdit] = useState(false);
	const [boardgameStatus, setBoardgameStatus] = useState('');
	const [isBoardgameBusy, setIsBoardgameBusy] = useState(false);
	const [, setIsBoardReady] = useState(false);
	const [boardRefreshKey, setBoardRefreshKey] = useState(0);

	const {
		scores,
		setScores,
		hasRolledThisGame,
		setHasRolledThisGame,
		hasRolledThisGameRef,
		diceCount,
		setDiceCount,
		diceCountRef,
		playerTileIndex,
		setPlayerTileIndex,
		playerTileIndexRef,
		currentTeamIndex,
		setCurrentTeamIndex,
		currentTeamIndexRef,
		teamSkipTurns,
		setTeamSkipTurns,
		teamSkipTurnsRef,
		teamPositions,
		setTeamPositions,
		teamPositionsRef,
		teamTileIds,
		setTeamTileIds,
		teamTileIdsRef,
		setTeamNames,
		teamCount,
		teamCountRef,
		setTeamCount,
		teams,
		loadedProgressBoardgameIdRef,
		resetTeamsToStart,
	} = useGameProgress(activeBoardgameId);

	// 상태 관리
	const [viewMode, setViewMode] = useState<'2.5d' | 'top'>('top');
	const viewModeRef = useRef<'2.5d' | 'top'>('top');
	const [isRolling, setIsRolling] = useState<boolean>(false);
	const isRollingRef = useRef(false);
	const [isFullscreen, setIsFullscreen] = useState(false);
	const [isMovingPawn, setIsMovingPawn] = useState<boolean>(false);
	const [isRestartConfirmOpen, setIsRestartConfirmOpen] = useState(false);
	const [goldCards, setGoldCards] = useState<GoldCardData[]>([]);
	const persistedGridSizeRef = useRef(boardSize);
	const persistedGoldCardsRef = useRef('[]');
	const [goldCardDrawPile, setGoldCardDrawPile] = useState<string[]>([]);
	const [drawnGoldCard, setDrawnGoldCard] = useState<GoldCardData | null>(null);
	const drawnGoldCardRef = useRef<GoldCardData | null>(null);
	const [isGoldCardModalOpen, setIsGoldCardModalOpen] = useState(false);
	const [selectingGoldCardId, setSelectingGoldCardId] = useState<string | null>(
		null,
	);
	const selectingGoldCardIdRef = useRef<string | null>(null);
	const goldCardActorTeamRef = useRef(0);
	const [goldCardActorTeamIndex, setGoldCardActorTeamIndex] = useState(0);
	const lastMovedTeamIndexRef = useRef(0);
	const [pendingTileEvent, setPendingTileEvent] =
		useState<BoardTileData | null>(null);
	const [eventCountdown, setEventCountdown] = useState<number | null>(null);
	const [eventNotice, setEventNotice] = useState<{
		title: string;
		message: string;
	} | null>(null);
	const popupConfirmButtonRef = useRef<HTMLButtonElement>(null);

	// 3D & 런타임 Refs
	const runtimeRef = useRef<ArenaRuntime | null>(null);

	const [isEditMode, setIsEditMode] = useState<boolean>(false);
	const [isGoldCardManagerOpen, setIsGoldCardManagerOpen] = useState(false);
	const [isAddingInnerTile, setIsAddingInnerTile] = useState(false);
	const isAddingInnerTileRef = useRef(isAddingInnerTile);
	const [isMovingInnerTile, setIsMovingInnerTile] = useState(false);
	const isMovingInnerTileRef = useRef(false);
	const [tileSelectionMode, setTileSelectionMode] =
		useState<TileSelectionMode>(null);
	const tileSelectionModeRef = useRef<TileSelectionMode>(null);
	const [selectedTileId, setSelectedTileId] = useState<string | null>(null);
	const selectedTileIdRef = useRef<string | null>(null);
	const [boardTilesMap, setBoardTilesMap] = useState<
		Map<string, BoardTileData>
	>(new Map());
	const tileIdRenamesRef = useRef(new Map<string, string>());
	const boardTilesMapRef = useRef(boardTilesMap);
	const editModeRef = useRef(isEditMode);
	const tileMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
	const innerCellMeshMapRef = useRef<Map<string, THREE.Mesh>>(new Map());
	const innerCellOutlineMapRef = useRef<Map<string, THREE.LineSegments>>(
		new Map(),
	);
	const innerCellGridRef = useRef<THREE.Group | null>(null);
	const selectionBoxRef = useRef<THREE.BoxHelper | null>(null);
	const orbitSnapshotRef = useRef<OrbitSnapshot | null>(null);
	const cameraViewRestoreRef = useRef<OrbitSnapshot | null>(null);

	useEffect(() => {
		boardTilesMapRef.current = boardTilesMap;
	}, [boardTilesMap]);

	useEffect(() => {
		let isActive = true;
		void listBoardgames().then((result) => {
			if (!isActive) return;
			if (result.success) setBoardgames(result.data);
			else setBoardgameStatus(result.message);
		});
		return () => {
			isActive = false;
		};
	}, []);

	useEffect(() => {
		if (boardgameStatus !== '') {
			setTimeout(() => setBoardgameStatus(''), 3000);
		}
	}, [boardgameStatus]);

	useEffect(() => {
		editModeRef.current = isEditMode;
		isAddingInnerTileRef.current = isAddingInnerTile;
		isMovingInnerTileRef.current = isMovingInnerTile;
		runtimeRef.current?.pawnMeshes.forEach((pawn, index) => {
			pawn.visible = !isEditMode && index < teamCount;
		});
		runtimeRef.current?.diceList.forEach((dice) => {
			dice.mesh.visible = !isEditMode;
		});
		if (runtimeRef.current?.goldCardDeckGroup) {
			runtimeRef.current.goldCardDeckGroup.visible = true;
		}
		if (innerCellGridRef.current) {
			const showInnerGrid =
				isEditMode && (isAddingInnerTile || isMovingInnerTile);
			innerCellGridRef.current.visible = showInnerGrid;
			innerCellMeshMapRef.current.forEach((mesh, id) => {
				const [gridR, gridC] = id.split('_').slice(1).map(Number);
				const isEmpty = !isInnerCellOccupied(boardTilesMap, gridR, gridC);
				mesh.visible = showInnerGrid && isEmpty;
				const outline = innerCellOutlineMapRef.current.get(id);
				if (outline) outline.visible = showInnerGrid && isEmpty;
			});
		}
	}, [boardTilesMap, isEditMode, isAddingInnerTile, isMovingInnerTile, teamCount]);

	// 마우스 다운 좌표 (클릭 판정용)
	const pointerDownPos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

	useEffect(() => {
		if (pendingTileEvent || eventNotice) {
			popupConfirmButtonRef.current?.focus();
		}
	}, [pendingTileEvent, eventNotice]);

	const {
		selectTile,
		isEditLockBlocked,
		canEditBoardRef,
		canEditSelectedTile,
		canEditSelectedTileRef,
		onEditableTileRenamedRef,
		handleUpdateTile,
		handleDeleteTile,
		switchView,
		beginTileSelection,
		applyServerGridSize,
		selectEditableTileRef,
		handleToggleEditMode,
		handleToggleAddingInnerTile,
		handleMoveTilePosition,
		applyGridSize,
	} = useTileEditor({
		activeBoardgameId,
		activeBoardgameCanEdit,
		isBoardgameBusy,
		setIsBoardgameBusy,
		setBoardgameStatus,
		refreshBoardgameList: () => refreshBoardgameList(),
		boardSize,
		setBoardSize,
		gridSizeDraft,
		setGridSizeDraft,
		setGridSizeError,
		persistedGridSizeRef,
		setBoardRefreshKey,
		boardTilesMap,
		setBoardTilesMap,
		boardTilesMapRef,
		tileIdRenamesRef,
		goldCards,
		setGoldCards,
		persistedGoldCardsRef,
		isEditMode,
		setIsEditMode,
		editModeRef,
		isAddingInnerTile,
		setIsAddingInnerTile,
		isAddingInnerTileRef,
		isMovingInnerTile,
		setIsMovingInnerTile,
		isMovingInnerTileRef,
		selectedTileId,
		setSelectedTileId,
		selectedTileIdRef,
		setTileSelectionMode,
		tileSelectionModeRef,
		setSelectingGoldCardId,
		selectingGoldCardIdRef,
		setViewMode,
		viewModeRef,
		runtimeRef,
		tileMeshMapRef,
		innerCellMeshMapRef,
		innerCellOutlineMapRef,
		selectionBoxRef,
		orbitSnapshotRef,
		resetTeamsToStart,
	});
	const {
		handleDiceSettled,
		applyDrawnGoldCard,
		syncDiceCount,
		rollDice,
		handleDiceCountChange,
		handleConfirmTileEvent,
		handleCloseEventNotice,
		selectGoldCardTarget,
		beginGoldCardEffectTargetSelection,
		handleRestartGame,
	} = useGamePlay({
		orbitSnapshotRef,
		teamCountRef,
		boardTilesMapRef,
		currentTeamIndexRef,
		teamSkipTurnsRef,
		setTeamSkipTurns,
		diceCountRef,
		drawnGoldCardRef,
		editModeRef,
		eventNotice,
		goldCardActorTeamRef,
		goldCardDrawPile,
		goldCards,
		hasRolledThisGameRef,
		isEditMode,
		isMovingPawn,
		isRolling,
		isRollingRef,
		lastMovedTeamIndexRef,
		pendingTileEvent,
		playerTileIndexRef,
		resetTeamsToStart,
		runtimeRef,
		selectTile,
		selectedTileIdRef,
		selectingGoldCardIdRef,
		setBoardgameStatus,
		setCurrentTeamIndex,
		setDiceCount,
		setDrawnGoldCard,
		setEventCountdown,
		setEventNotice,
		setGoldCardActorTeamIndex,
		setGoldCardDrawPile,
		setHasRolledThisGame,
		setIsGoldCardModalOpen,
		setIsMovingPawn,
		setIsRestartConfirmOpen,
		setIsRolling,
		setPendingTileEvent,
		setPlayerTileIndex,
		setScores,
		setSelectedTileId,
		setSelectingGoldCardId,
		setTeamPositions,
		setTeamTileIds,
		setTileSelectionMode,
		switchView,
		teamPositionsRef,
		teamTileIdsRef,
		tileSelectionModeRef,
	});

	useBeforeUnloadWarning(isEditMode, selectedTileId);

	const handleCloseTileInspector = () => {
		setIsMovingInnerTile(false);
		isMovingInnerTileRef.current = false;
		tileSelectionModeRef.current = null;
		setTileSelectionMode(null);
		selectTile(null);
	};

	const handleChangeTeamName = (teamIndex: number, name: string) => {
		setTeamNames((current) =>
			current.map((teamName, index) =>
				index === teamIndex ? name.slice(0, 24) : teamName,
			),
		);
	};

	useArenaScene({
		teamCountRef,
		onEditableTileRenamedRef,
		canEditBoardRef,
		canEditSelectedTileRef,
		activeBoardgameId,
		boardRefreshKey,
		boardSize,
		canvasRef,
		containerRef,
		runtimeRef,
		tileMeshMapRef,
		innerCellMeshMapRef,
		innerCellOutlineMapRef,
		innerCellGridRef,
		selectionBoxRef,
		boardTilesMapRef,
		selectedTileIdRef,
		editModeRef,
		isAddingInnerTileRef,
		isMovingInnerTileRef,
		isRollingRef,
		diceCountRef,
		viewModeRef,
		cameraViewRestoreRef,
		orbitSnapshotRef,
		pointerDownPos,
		tileSelectionModeRef,
		selectingGoldCardIdRef,
		tileIdRenamesRef,
		teamTileIdsRef,
		teamPositionsRef,
		selectEditableTileRef,
		setIsBoardReady,
		setBoardTilesMap,
		setTileSelectionMode,
		setGoldCards,
		setSelectingGoldCardId,
		setTeamTileIds,
		setTeamPositions,
		setIsMovingInnerTile,
		setIsAddingInnerTile,
		setSelectedTileId,
		applyDrawnGoldCard,
		handleDiceSettled,
		selectTile,
		syncDiceCount,
	});

	const {
		refreshBoardgameList,
		handleLoadBoardgame,
		handleCreatedBoardgame,
		handleDeleteBoardgame,
	} = useBoardgameSession({
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
	});

	const totalScore = scores.reduce((acc, cur) => acc + cur, 0);

	const diceArenaProps = {
		game: {
			state: {
				teams,
				currentTeamIndex,
				teamSkipTurns,
				teamPositions,
				teamTileIds,
				playerTileIndex,
				scores,
				totalScore,
				diceCount,
				isRolling,
				isMovingPawn,
				hasRolledThisGame,
				pendingTileEvent,
				hasPendingGoldCard: isGoldCardModalOpen || drawnGoldCard !== null || tileSelectionMode === 'gold-card-effect-target',
				eventNotice,
			},
			actions: {
				onRollDice: rollDice,
				onChangeDiceCount: handleDiceCountChange,
				onChangeTeamName: handleChangeTeamName,
				onChangeTeamCount: setTeamCount,
				onRestartGame: () => setIsRestartConfirmOpen(true),
			},
		},
		editor: {
			state: {
				canEdit: activeBoardgameCanEdit,
				isEditMode,
				isBusy: isBoardgameBusy,
				isLockBlocked: isEditLockBlocked,
				canEditSelectedTile,
				isAddingInnerTile,
				isMovingInnerTile,
				selectedTileId,
				tileSelectionMode,
				boardSize,
				gridSizeDraft,
				gridSizeError,
				boardTilesMap,
			},
			actions: {
				setGridSizeDraft,
				onToggleEditMode: () => void handleToggleEditMode(),
				onApplyGridSize: applyGridSize,
				onToggleAddInnerTile: handleToggleAddingInnerTile,
				onMoveTilePosition: handleMoveTilePosition,
				onBeginTileSelection: beginTileSelection,
				onUpdateTile: handleUpdateTile,
				onDeleteTile: handleDeleteTile,
				onCloseTileInspector: handleCloseTileInspector,
			},
		},
		goldCard: {
			state: {
				cards: goldCards,
				isManagerOpen: isGoldCardManagerOpen,
				selectingTargetCardId: selectingGoldCardId,
			},
			actions: {
				setCards: setGoldCards,
				onToggleManager: () => setIsGoldCardManagerOpen((open) => !open),
				onSelectTargetCard: selectGoldCardTarget,
			},
		},
		view: {
			isFullscreen,
			onToggleFullscreen: () => setIsFullscreen((current) => !current),
		},
	};

  return {
    header: {
      refresh: refreshBoardgameList, boardgames, activeBoardgameId,
      isBusy: isBoardgameBusy || isEditMode || isRolling || isMovingPawn || Boolean(pendingTileEvent || eventNotice) || isGoldCardModalOpen || drawnGoldCard !== null,
      onSelect: handleLoadBoardgame, onCreated: handleCreatedBoardgame, onDeleteBoardgame: handleDeleteBoardgame,
    },
    viewport: {
      status: boardgameStatus, containerRef, canvasRef, isFullscreen, tileEvent: pendingTileEvent, eventCountdown,
      onConfirmTileEvent: handleConfirmTileEvent, eventNotice, onCloseEventNotice: handleCloseEventNotice,
      popupConfirmButtonRef, viewMode, onSwitchView: switchView, automaticCamera: isRolling || isMovingPawn,
    },
    sidebar: diceArenaProps,
    card: (isGoldCardModalOpen || tileSelectionMode === 'gold-card-effect-target') ? {
      card: drawnGoldCard, teamNames: teams.map(team => team.name), actorTeamIndex: goldCardActorTeamIndex,
      selectingTarget: tileSelectionMode === 'gold-card-effect-target', onApply: () => applyDrawnGoldCard(),
      onChooseTarget: beginGoldCardEffectTargetSelection, onChooseSwapTeam: (teamIndex: number) => applyDrawnGoldCard({ teamIndex }),
    } : null,
    restart: isRestartConfirmOpen ? { onConfirm: handleRestartGame, onCancel: () => setIsRestartConfirmOpen(false) } : null,
  };
}
