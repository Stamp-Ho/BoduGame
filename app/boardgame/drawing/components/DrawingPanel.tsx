'use client';
import {
	useEffect,
	useImperativeHandle,
	useState,
	type Dispatch,
	type Ref,
	type SetStateAction,
} from 'react';
import { DrawingToolbar } from './DrawingToolbar';
import { drawingUses, deleteDrawing, saveDrawing } from '../actions';
import { useDrawingPanel } from '../hooks/useDrawingPanel';
import type { ResizeDirection } from '../hooks/useDrawingCanvas';
import styles from './DrawingSelection.module.css';
import type { BoardDrawing } from '../types';
import { loadDrawingImage } from '../utils/images';
import { ArrowLeftCircle } from 'lucide-react';

const actionButton =
	'rounded-lg border px-3 py-1.25 text-xs font-semibold transition-colors disabled:opacity-40';
const neutralButton =
	actionButton +
	' border-slate-700 bg-slate-800 text-slate-200 enabled:hover:border-sky-400 enabled:hover:text-white';
const primaryButton =
	actionButton +
	' border-sky-500/40 bg-sky-600/20 text-sky-300 enabled:hover:bg-sky-600 enabled:hover:text-white';

const resizeHandles: (ResizeDirection & { label: string; cursor: string })[] = [
	{ x: -1, y: -1, label: '왼쪽 위', cursor: 'nwse-resize' },
	{ x: 1, y: -1, label: '오른쪽 위', cursor: 'nesw-resize' },
	{ x: -1, y: 1, label: '왼쪽 아래', cursor: 'nesw-resize' },
	{ x: 1, y: 1, label: '오른쪽 아래', cursor: 'nwse-resize' },
	{ x: 0, y: -1, label: '위쪽', cursor: 'ns-resize' },
	{ x: 0, y: 1, label: '아래쪽', cursor: 'ns-resize' },
	{ x: -1, y: 0, label: '왼쪽', cursor: 'ew-resize' },
	{ x: 1, y: 0, label: '오른쪽', cursor: 'ew-resize' },
];

function isTextInput(target: EventTarget) {
	return (
		target instanceof HTMLElement &&
		(target.closest('input, textarea, select') || target.isContentEditable)
	);
}

function DrawingThumbnail({
	id,
	version,
}: Pick<BoardDrawing, 'id' | 'version'>) {
	const [src, setSrc] = useState<string>();
	useEffect(() => {
		let active = true;
		void loadDrawingImage(id, version)
			.then((image) => {
				if (active) setSrc(image.src);
			})
			.catch(() => {});
		return () => {
			active = false;
		};
	}, [id, version]);
	if (!src) return <div className="h-20 w-full bg-slate-800" />;
	return (
		// eslint-disable-next-line @next/next/no-img-element
		<img className="h-20 w-full bg-slate-800 object-contain" alt="" src={src} />
	);
}

export type DrawingPanelHandle = { canLeave: () => boolean };

export function DrawingPanel({
	ref,
	...props
}: Parameters<typeof useDrawingPanel>[0] & {
	ref?: Ref<DrawingPanelHandle>;
	tiles: ReadonlyMap<string, Parameters<typeof useDrawingPanel>[0]['tile']>;
	drawings: BoardDrawing[];
	setDrawings: Dispatch<SetStateAction<BoardDrawing[]>>;
	clipboard: HTMLCanvasElement | null;
	onCopy: (image: HTMLCanvasElement) => void;
}) {
	const {
		selected,
		setSelected,
		height,
		editing,
		name,
		setName,
		busy,
		unlocked,
		setUnlocked,
		loading,
		setLoading,
		copy,
		setCopy,
		mode,
		setMode,
		brush,
		setBrush,
		selectionBox,
		canvas,
		reset,
		undo,
		copyPixels,
		pastePixels,
		startResize,
		previewResize,
		finishResize,
		down,
		move,
		up,
		cancelGesture,
		cancelCurve,
		clear,
		canLeave,
		task,
		open,
		closeEditor,
		point,
		apply,
	} = useDrawingPanel(props);
	useImperativeHandle(ref, () => ({ canLeave: () => !busy && canLeave() }));
	const { tile, tiles, onClose, clipboard, onCopy, drawings, setDrawings } =
		props;
	const appliedId = tile.action.params?.drawingId;
	const [chosenId, setChosenId] = useState<string | null>(null);
	const linkedIds = new Set(
		[...tiles.values()].map((item) => item.action.params?.drawingId),
	);
	const rows = [...drawings].sort(
		(a, b) =>
			Number(linkedIds.has(b.id)) - Number(linkedIds.has(a.id)) ||
			a.name.localeCompare(b.name, 'ko'),
	);
	const chosen =
		rows.find((row) => row.id === chosenId) ??
		rows.find((row) => row.id === appliedId);
	function copyDrawing() {
		const image = copyPixels();
		if (!image) return;
		onCopy(image);
		props.onMessage('그림판에 복사했습니다.');
	}
	const canSaveDrawing = unlocked && !busy && !loading;
	function handleSaveDrawing() {
		const element = canvas.current;
		if (!canSaveDrawing || !element) return;
		void task(async () => {
			cancelGesture();
			cancelCurve();
			const blob = await new Promise<Blob | null>((resolve) =>
				element.toBlob(resolve, 'image/png'),
			);
			if (!blob) throw new Error('그림 변환에 실패했습니다.');
			const form = new FormData();
			form.set('file', blob, 'drawing.png');
			form.set('name', name);
			if (selected && !copy) {
				form.set('id', selected.id);
				form.set('version', String(selected.version));
			}
			const row = await saveDrawing(form);
			void loadDrawingImage(row.id, row.version, blob).catch(() => {});
			window.dispatchEvent(
				new CustomEvent('boardgame-drawing-saved', {
					detail: { id: row.id, version: row.version },
				}),
			);
			setDrawings((current) => [
				...current.filter((item) => item.id !== row.id),
				{ ...row, canEdit: true },
			]);
			setCopy(false);
			setLoading(true);
			setSelected({ ...row, canEdit: true });
			reset();
			apply(row);
			setChosenId(row.id);
		});
	}
	return (
		<section
			className="pointer-events-auto min-h-0 w-full flex-1 space-y-3 overflow-y-auto rounded-2xl border border-slate-700/80 bg-slate-900/95 p-3 pb-4 text-slate-200 shadow-2xl"
			onKeyDown={(e) => {
				if (
					!editing ||
					busy ||
					loading ||
					!(e.ctrlKey || e.metaKey) ||
					e.altKey ||
					e.shiftKey
				)
					return;
				if (isTextInput(e.target)) return;
				const key = e.key.toLowerCase();
				if (key === 'c' && !window.getSelection()?.toString()) {
					e.preventDefault();
					copyDrawing();
				}
			}}
			onPaste={(e) => {
				if (!editing || busy || loading || !unlocked || isTextInput(e.target))
					return;
				const file = Array.from(e.clipboardData.files).find((item) =>
					item.type.startsWith('image/'),
				);
				if (!file && !clipboard) return;
				e.preventDefault();
				if (file) {
					void task(async () => {
						const image = await createImageBitmap(file).catch(() => {
							throw new Error('클립보드의 이미지를 읽지 못했습니다.');
						});
						try {
							pastePixels(image);
						} finally {
							image.close();
						}
					});
				} else if (clipboard) {
					pastePixels(clipboard);
				}
			}}
		>
			<div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-3">
				<div className="min-w-0">
					<div className="flex flex-wrap items-center gap-2">
						<span className="rounded border border-sky-500/30 bg-sky-500/20 px-2 py-0.5 text-xs font-bold text-sky-400">
							{tile.category}
						</span>
						<h3 className="text-sm font-bold text-white">배경 그리기</h3>
					</div>
				</div>
				<button
					type="button"
					className="shrink-0 rounded-lg p-1 text-xs text-slate-400 hover:bg-slate-800 hover:text-white"
					onClick={() => {
						if (editing) closeEditor();
						else onClose();
					}}
				>
					<ArrowLeftCircle size={16} className="inline-block mr-1 -mt-0.5" />
					{editing ? '그림 목록으로' : '타일 편집으로'}
				</button>
			</div>
			{!editing ? (
				<fieldset disabled={busy} className="space-y-3">
					<div className="grid grid-cols-3 gap-2">
						<button
							type="button"
							className={neutralButton}
							disabled={!chosen}
							onClick={() => {
								if (!chosen) return;
								apply(chosen);
								onClose();
							}}
						>
							선택
						</button>
						<button
							type="button"
							className={neutralButton}
							disabled={!chosen}
							onClick={() => {
								if (!chosen) return;
								if (!chosen.canEdit) {
									open(chosen);
									return;
								}
								void task(async () => {
									const uses = await drawingUses(chosen.id);
									if (
										uses.length > 1 &&
										!window.confirm(
											uses.length + '개 타일에 적용된 원본을 수정할까요?',
										)
									)
										return;
									open(chosen);
								});
							}}
						>
							수정
						</button>
						<button
							type="button"
							className={primaryButton}
							onClick={() => open(null)}
						>
							새로 그리기
						</button>
					</div>
					{rows.length ? (
						<ul className="grid grid-cols-2 gap-2">
							{rows.map((row) => (
								<li key={row.id}>
									<button
										type="button"
										aria-pressed={chosen?.id === row.id}
										className="h-full w-full rounded-lg border border-slate-700 bg-slate-800/60 p-2 text-left text-xs text-slate-200 transition-colors hover:border-sky-400 aria-pressed:border-sky-400 aria-pressed:bg-sky-600/20 aria-pressed:text-white"
										onClick={() => setChosenId(row.id)}
									>
										<DrawingThumbnail
											key={row.version}
											id={row.id}
											version={row.version}
										/>
										<span className="mt-1 block break-words">{row.name}</span>
										{appliedId === row.id && (
											<span className="block text-[11px] text-sky-300">
												현재 타일
											</span>
										)}
									</button>
								</li>
							))}
						</ul>
					) : (
						<p className="text-xs text-slate-400">표시할 그림이 없습니다.</p>
					)}
				</fieldset>
			) : (
				<fieldset disabled={busy} className="space-y-2.5">
					{selected?.canEdit && !copy && (
						<div className="flex flex-wrap gap-3 justify-end">
							<button
								type="button"
								className={neutralButton}
								onClick={() => {
									setCopy(true);
									setName(name + ' 복사');
									setUnlocked(true);
								}}
							>
								복제 후 수정
							</button>
							<button
								type="button"
								className={
									actionButton +
									' border-red-500/40 bg-red-600/20 text-red-300 hover:bg-red-600 hover:text-white'
								}
								onClick={() =>
									void task(async () => {
										const uses = await drawingUses(selected.id);
										if (
											!window.confirm(
												uses.length +
													'개 타일의 그림이 사라집니다. 삭제할까요?',
											)
										)
											return;
										await deleteDrawing(selected.id);
										window.dispatchEvent(
											new CustomEvent('boardgame-drawing-saved', {
												detail: { id: selected.id, deleted: true },
											}),
										);
										setDrawings((current) =>
											current.filter((row) => row.id !== selected.id),
										);
										closeEditor(true);
									})
								}
							>
								삭제
							</button>
						</div>
					)}
					<label className="flex items-center gap-2 whitespace-nowrap text-xs font-semibold text-slate-300">
						이름
						<input
							className="min-w-0 flex-1 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-white focus:border-sky-500 focus:outline-none"
							value={name}
							maxLength={80}
							onChange={(e) => setName(e.target.value)}
						/>
						<p className="text-xs text-slate-400">512 × {height}</p>
					</label>
					<div className="grid grid-cols-2 gap-2 border-t border-slate-800 pt-3">
						<button
							type="button"
							className={mode === 'canvas' ? primaryButton : neutralButton}
							aria-pressed={mode === 'canvas'}
							onClick={() => setMode('canvas')}
						>
							그림만 편집
						</button>
						<button
							type="button"
							className={mode === 'tile' ? primaryButton : neutralButton}
							aria-pressed={mode === 'tile'}
							onClick={() => setMode('tile')}
						>
							타일에 적용
						</button>
					</div>
					{mode === 'tile' && (
						<p className="text-xs text-slate-400 animate-pulse">
							타일에 직접 그림을 그릴 수 있어요.
						</p>
					)}
					<div className="rounded-lg border border-slate-700/50 bg-slate-800/60 p-2">
						<DrawingToolbar
							brush={brush}
							set={setBrush}
							canEdit={unlocked && !loading}
							undo={undo}
							clear={clear}
							canSave={canSaveDrawing}
							onSave={handleSaveDrawing}
							copyLabel={
								brush.tool === 'select' && selectionBox
									? '선택 영역 복사'
									: '그림 전체 복사'
							}
							onCopy={loading ? undefined : copyDrawing}
							onPaste={
								clipboard && unlocked && !loading
									? () => pastePixels(clipboard)
									: undefined
							}
						/>
					</div>
					{selected && copy && (
						<p className="text-xs text-amber-200">
							저장하면 복사본을 현재 타일에 연결합니다.
						</p>
					)}
					<p className="text-xs text-slate-400">
						클립보드 이미지는 Ctrl+V로 붙여넣으세요.
					</p>
					<div className="relative mx-3 mt-7 mb-4">
						<canvas
							ref={canvas}
							width={512}
							height={height}
							tabIndex={0}
							aria-label="그림 캔버스"
							className="block w-full touch-none bg-slate-800 outline outline-slate-700 focus-visible:outline-sky-400
                        scale-110
                        "
							onPointerDown={(e) => {
								if (
									!unlocked ||
									busy ||
									loading ||
									e.button !== 0 ||
									!e.isPrimary
								)
									return;
								e.currentTarget.setPointerCapture(e.pointerId);
								down(point(e));
							}}
							onPointerMove={(e) => {
								if (e.currentTarget.hasPointerCapture(e.pointerId))
									move(point(e));
							}}
							onPointerUp={(e) => {
								if (e.currentTarget.hasPointerCapture(e.pointerId)) {
									up(point(e));
									e.currentTarget.releasePointerCapture(e.pointerId);
								}
							}}
							onLostPointerCapture={cancelGesture}
						/>
						{selectionBox && brush.tool === 'select' && (
							<div
								className={styles.selection}
								style={{
									left: (selectionBox.x / 512) * 100 + '%',
									top: (selectionBox.y / height) * 100 + '%',
									width: (selectionBox.width / 512) * 100 + '%',
									height: (selectionBox.height / height) * 100 + '%',
								}}
							>
								{unlocked &&
									!loading &&
									resizeHandles.map((handle) => (
										<button
											type="button"
											key={handle.label}
											tabIndex={-1}
											aria-label={handle.label + ' 크기 조절'}
											className={styles.handle}
											data-x={handle.x}
											data-y={handle.y}
											style={{
												left: (handle.x + 1) * 50 + '%',
												top: (handle.y + 1) * 50 + '%',
												cursor: handle.cursor,
											}}
											onPointerDown={(e) => {
												if (
													busy ||
													e.button !== 0 ||
													!e.isPrimary ||
													!startResize(point(e, false), handle)
												)
													return;
												e.currentTarget.setPointerCapture(e.pointerId);
											}}
											onPointerMove={(e) => {
												if (e.currentTarget.hasPointerCapture(e.pointerId))
													previewResize(point(e, false));
											}}
											onPointerUp={(e) => {
												if (e.currentTarget.hasPointerCapture(e.pointerId))
													finishResize(point(e, false));
											}}
											onLostPointerCapture={() => finishResize()}
										/>
									))}
							</div>
						)}
					</div>
				</fieldset>
			)}
		</section>
	);
}
