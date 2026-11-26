'use client';
import { useCallback, useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import { DrawingPanel, type DrawingPanelHandle } from '../drawing/components/DrawingPanel';
import type { BoardDrawing } from '../drawing/types';

import GoldCardManager from '../gold-cards/components/GoldCardManager';
import { DiceArenaSidebarProps } from '../types/DiceArenaProps';
import TileInspector from './TileInspector';
import TeamPanel from './TeamPanel';

export default function DiceArenaSidebar({
	boardId,
	drawings,
	setDrawings,
	props: { game, editor, goldCard, view },
}: DiceArenaSidebarProps & { boardId: string; drawings: BoardDrawing[]; setDrawings: Dispatch<SetStateAction<BoardDrawing[]>> }) {
	const [drawingTileKey, setDrawingTileKey] = useState<string | null>(null);
	const [editingCardId, setEditingCardId] = useState<string | null>(null);
	const [drawingToast, setDrawingToast] = useState<{ message: string } | null>(null);
	const showDrawingToast = useCallback((message: string) => setDrawingToast({ message }), []);
	useEffect(() => {
		if (!drawingToast) return;
		const timeout = window.setTimeout(() => setDrawingToast(null), 4000);
		return () => window.clearTimeout(timeout);
	}, [drawingToast]);
	const drawingPanel = useRef<DrawingPanelHandle>(null);
	const [drawingClipboard, setDrawingClipboard] =
		useState<HTMLCanvasElement | null>(null);
	const { state: gameState, actions: gameActions } = game;
	const { state: editorState, actions: editorActions } = editor;
	const { state: goldCardState, actions: goldCardActions } = goldCard;
	const { isFullscreen, onToggleFullscreen } = view;
	const remainingSkipTurns =
		gameState.teamSkipTurns[gameState.currentTeamIndex] ?? 0;

	const preventRoll =
		gameState.isRolling ||
		gameState.isMovingPawn ||
		gameState.hasPendingGoldCard ||
		Boolean(gameState.pendingTileEvent || gameState.eventNotice) ||
		goldCardState.selectingTargetCardId !== null ||
		editorState.tileSelectionMode === 'gold-card-effect-target';

	const selectedTile = editorState.selectedTileId
		? editorState.boardTilesMap.get(editorState.selectedTileId)
		: null;
	const selectedTileKey = editorState.isEditMode && selectedTile
		? boardId + ':' + selectedTile.id
		: null;
	if (drawingTileKey !== null && drawingTileKey !== selectedTileKey) setDrawingTileKey(null);
	const showDrawing = drawingTileKey !== null && drawingTileKey === selectedTileKey;
	const editingCard = editorState.isEditMode && goldCardState.cards.some((card) => card.id === editingCardId);
	if (editingCardId !== null && !editingCard) setEditingCardId(null);
	const showAddTile = editorState.isEditMode && !editorState.selectedTileId && !editingCard;
	const editCard = (cardId: string | null) => {
		if (cardId && drawingPanel.current && !drawingPanel.current.canLeave()) return false;
		if (cardId) setDrawingTileKey(null);
		if (goldCardState.selectingTargetCardId && cardId !== goldCardState.selectingTargetCardId) {
			goldCardActions.onSelectTargetCard(goldCardState.selectingTargetCardId);
		}
		setEditingCardId(cardId);
		return true;
	};
	const sidebarClass = `flex w-full shrink-0 flex-col gap-4 overflow-y-auto border-t border-slate-800 bg-slate-900/95 p-4 text-slate-200 lg:min-h-0 lg:w-[22rem] lg:border-l lg:border-t-0 ${
		isFullscreen ? 'min-h-0' : 'min-h-175'
	}`;
	return (
		<aside className={sidebarClass}>
			<div className="sticky top-0 z-10 grid shrink-0 grid-cols-2 gap-2 bg-slate-900">
				<button
					type="button"
					disabled={
						editorState.isBusy ||
						editorState.isLockBlocked ||
						!editorState.canEdit ||
						gameState.hasPendingGoldCard ||
						gameState.isRolling ||
						gameState.isMovingPawn
					}
					onClick={() => {
						if (drawingPanel.current && !drawingPanel.current.canLeave()) return;
						setDrawingTileKey(null);
						editorActions.onToggleEditMode();
					}}
					className={`rounded-lg border px-3 py-2 text-xs font-bold transition-colors disabled:cursor-not-allowed disabled:opacity-40 ${
						editorState.isEditMode
							? 'border-amber-500/50 bg-amber-500/20 text-amber-300'
							: 'border-slate-700 bg-slate-900 text-slate-300 hover:border-sky-400'
					}`}
				>
					{editorState.isEditMode ? '완료' : '편집 시작'}
				</button>
				<button
					type="button"
					onClick={onToggleFullscreen}
					className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-semibold text-slate-300 transition-colors hover:border-sky-400 hover:text-white"
					aria-label={isFullscreen ? '전체화면 종료' : '전체화면'}
				>
					{isFullscreen ? '전체화면 종료' : '전체화면'}
				</button>
				{showAddTile && (
					<div className="col-span-2 flex items-center justify-between gap-2">
						<p className="text-xs font-semibold text-sky-200 motion-safe:animate-pulse">
							{editorState.isAddingInnerTile
								? '보드 안쪽의 표시된 칸을 클릭하세요.'
								: '타일을 선택해 편집하세요'}
						</p>
						<button
							type="button"
							disabled={editorState.isLockBlocked || editorState.isBusy}
							aria-pressed={editorState.isAddingInnerTile}
							onClick={editorActions.onToggleAddInnerTile}
							className="shrink-0 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs font-bold text-slate-300 transition-colors enabled:hover:border-sky-400 aria-pressed:border-sky-400 aria-pressed:bg-sky-500/20 aria-pressed:text-sky-200 disabled:opacity-40"
						>
							{editorState.isAddingInnerTile ? '칸 추가 중단' : '내부 칸 추가'}
						</button>
					</div>
				)}
			</div>

			{editorState.isLockBlocked && (
				<p role="alert" className="text-xs leading-5 text-amber-300">
					편집 잠금을 확인할 수 없어 입력과 저장을 중단했습니다. 작성한 내용은
					유지됩니다.
				</p>
			)}
			{!editorState.isEditMode ? (
				<>
					<div className="flex items-center justify-between">
						<div>
							<p className="text-[11px] font-bold uppercase tracking-[0.2em] text-sky-400">
								Game Board
							</p>
							<h2 className="text-lg font-black text-white">게임 기판</h2>
						</div>
						<span className="text-xs text-slate-400">
							{editorState.boardSize.rows} × {editorState.boardSize.cols}
						</span>
					</div>
					<div className="flex items-center justify-between rounded-xl border border-slate-700 bg-slate-950/70 px-3 py-2">
						<div>
							<p className="text-[11px] font-semibold text-slate-300">
								이번 턴 주사위 개수
							</p>
							<p className="text-[10px] text-slate-500">
								던지기 전에 선택하세요 (1~3개)
							</p>
						</div>
						<div className="flex items-center gap-3">
							<button
								type="button"
								aria-label="주사위 한 개 줄이기"
								disabled={gameState.diceCount <= 1 || preventRoll}
								onClick={() =>
									gameActions.onChangeDiceCount(gameState.diceCount - 1)
								}
								className="h-8 w-8 rounded-lg border border-slate-600 text-lg font-bold text-white hover:bg-slate-800 disabled:opacity-40"
							>
								−
							</button>
							<span className="min-w-5 text-center text-lg font-black text-amber-300">
								{gameState.diceCount}
							</span>
							<button
								type="button"
								aria-label="주사위 한 개 늘리기"
								disabled={gameState.diceCount >= 3 || preventRoll}
								onClick={() =>
									gameActions.onChangeDiceCount(gameState.diceCount + 1)
								}
								className="h-8 w-8 rounded-lg border border-slate-600 text-lg font-bold text-white hover:bg-slate-800 disabled:opacity-40"
							>
								+
							</button>
						</div>
					</div>
					<button
						type="button"
						disabled={preventRoll}
						onClick={gameActions.onRollDice}
						className="w-full rounded-xl bg-linear-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/20 transition-all hover:from-blue-500 hover:to-indigo-500 disabled:pointer-events-none disabled:opacity-50"
					>
						{gameState.isRolling
							? '주사위 굴리는 중...'
							: gameState.isMovingPawn
								? '말 이동 중...'
								: remainingSkipTurns > 0
									? '턴 넘기기'
									: '주사위 던지기'}
					</button>
					{remainingSkipTurns > 0 && (
						<p className="text-center text-xs font-semibold text-amber-300">
							탈출로 찾기({remainingSkipTurns}턴 남음) · 술 마시기 벌칙
						</p>
					)}

					<div className="grid grid-cols-3 gap-3">
						<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3">
							<p className="text-[11px] font-semibold text-slate-400">
								주사위 결과
							</p>
							<p className="mt-1 text-2xl font-black text-amber-400">
								{gameState.isRolling ? '...' : gameState.totalScore || '-'}
							</p>
							<p className="mt-1 text-[10px] text-slate-500">
								{gameState.scores.length
									? gameState.scores.join(' + ')
									: '대기 중'}
							</p>
						</div>
						<div className="rounded-xl border border-slate-700 bg-slate-950/70 p-3 col-span-2">
							<p className="text-[11px] font-semibold text-slate-400">
								현재 턴
							</p>
							<p
								className="mt-1 truncate text-lg font-black"
								style={{
									color: gameState.teams[gameState.currentTeamIndex].color,
								}}
							>
								{gameState.teams[gameState.currentTeamIndex].name}
							</p>
							<p className="mt-1 text-[10px] text-slate-500">
								말 위치{' '}
								{gameState.teamTileIds[gameState.currentTeamIndex]?.startsWith(
									'inner_',
								)
									? editorState.boardTilesMap.get(
											gameState.teamTileIds[gameState.currentTeamIndex],
										)?.label ||
										gameState.teamTileIds[gameState.currentTeamIndex]
									: `${gameState.playerTileIndex}번`}
							</p>
						</div>
					</div>

					<TeamPanel
						game={game}
						tiles={editorState.boardTilesMap}
						disabled={preventRoll || editorState.isBusy}
					/>
					<button
						type="button"
						disabled={preventRoll}
						onClick={gameActions.onRestartGame}
						className="w-full rounded-xl border border-sky-500/40 bg-sky-950/30 px-4 py-2.5 text-xs font-bold text-sky-200 transition-colors hover:bg-sky-900/50 disabled:opacity-40"
					>
						게임 처음부터 다시하기
					</button>
				</>
			) : editorState.selectedTileId && !editingCard ? (
				<fieldset
					disabled={editorState.isLockBlocked || !editorState.canEditSelectedTile}
					className="min-w-0 shrink-0"
				>
					{showDrawing && selectedTile ? (
						<DrawingPanel
							key={selectedTileKey}
							ref={drawingPanel}
							drawings={drawings}
							setDrawings={setDrawings}
							boardSize={editorState.boardSize}
							tiles={editorState.boardTilesMap}
							tile={selectedTile}
							canEditTile={editorState.canEditSelectedTile && !editorState.isLockBlocked}
							onUpdate={editorActions.onUpdateTile}
							onClose={() => setDrawingTileKey(null)}
							clipboard={drawingClipboard}
							onCopy={setDrawingClipboard}
							onMessage={showDrawingToast}
						/>
					) : (
						<TileInspector
							onDraw={() => setDrawingTileKey(selectedTileKey)}
							tile={selectedTile ?? null}
							availableTiles={[...editorState.boardTilesMap.values()]}
							isMovingPosition={editorState.isMovingInnerTile}
							isSelectingNextTile={editorState.tileSelectionMode === 'next'}
							isSelectingTeleportTile={
								editorState.tileSelectionMode === 'teleport'
							}
							isSelectingDirectionTile={
								editorState.tileSelectionMode === 'direction'
							}
							onSelectNextTile={() => editorActions.onBeginTileSelection('next')}
							onSelectTeleportTile={() =>
								editorActions.onBeginTileSelection('teleport')
							}
							onSelectDirectionTile={() =>
								editorActions.onBeginTileSelection('direction')
							}
							onMovePosition={editorActions.onMoveTilePosition}
							onUpdate={editorActions.onUpdateTile}
							onDelete={editorActions.onDeleteTile}
							onClose={editorActions.onCloseTileInspector}
						/>
					)}
				</fieldset>
			) : null}
			{editorState.isEditMode && (!editorState.selectedTileId || editingCard) && (
				<fieldset disabled={editorState.isLockBlocked || editorState.isBusy} className="contents">
					{!editingCard && (
						<section className="space-y-3 rounded-xl border border-slate-700 bg-slate-950/50 p-3">
							<div className="flex flex-row gap-2">
								<h3 className="text-sm font-bold text-white">격자 크기</h3>
								<p className="mt-1 text-[11px] text-slate-400">
									각 변은 3~20칸으로 설정할 수 있습니다.
								</p>
							</div>
							<div className="flex flex-row gap-2 w-full">
								<label className="space-y-1 flex flex-row items-center gap-1 text-xs font-semibold text-slate-300">
									세로
									<input
										type="number"
										min={3}
										max={20}
										step={1}
										value={editorState.gridSizeDraft.rows}
										onChange={(event) =>
											editorActions.setGridSizeDraft((current) => ({
												...current,
												rows: event.target.value,
											}))
										}
										className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500"
									/>
								</label>
								<label className="space-y-1 flex flex-row items-center gap-1 text-xs font-semibold text-slate-300">
									가로
									<input
										type="number"
										min={3}
										max={20}
										step={1}
										value={editorState.gridSizeDraft.cols}
										onChange={(event) =>
											editorActions.setGridSizeDraft((current) => ({
												...current,
												cols: event.target.value,
											}))
										}
										className="w-16 rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-sm text-white outline-none focus:border-sky-500"
									/>
								</label>
								<button
									type="button"
									onClick={editorActions.onApplyGridSize}
									disabled={preventRoll}
									className="w-18 ml-auto rounded-lg border border-sky-600 bg-sky-600 px-3 h-8.5 text-xs font-bold text-white transition-colors hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-50"
								>
									적용
								</button>
							</div>
							{editorState.gridSizeError && (
								<p className="text-xs text-sky-300">
									{editorState.gridSizeError}
								</p>
							)}
						</section>
					)}

					<GoldCardManager
						cards={goldCardState.cards}
						availableTiles={[...editorState.boardTilesMap.values()].map(
							(tile) => ({ id: tile.id, label: tile.label }),
						)}
						selectingCardId={goldCardState.selectingTargetCardId}
						editingCardId={editingCardId}
						onEditCard={editCard}
						onChange={goldCardActions.setCards}
						onSelectTarget={goldCardActions.onSelectTargetCard}
					/>
				</fieldset>
			)}
			<div role="status" className="pointer-events-none fixed inset-x-4 bottom-4 z-[60] flex justify-end">
				{drawingToast && (
					<p className="max-w-sm break-words rounded-lg border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 shadow-xl">
						{drawingToast.message}
					</p>
				)}
			</div>
		</aside>
	);
}
