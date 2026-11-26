import { useState } from 'react';
import {
	ClipboardPaste,
	Copy,
	Ellipse,
	Eraser,
	PaintBucket,
	Pencil,
	Pipette,
	Redo2,
	Slash,
	Spline,
	Square,
	SquareDashed,
	Undo2,
} from 'lucide-react';
import type { Brush } from '../types';

const paintTools = [
	{ tool: 'pen', label: '펜', Icon: Pencil },
	{ tool: 'fill', label: '채우기', Icon: PaintBucket },
	{ tool: 'eraser', label: '지우개', Icon: Eraser },
	{ tool: 'eyedropper', label: '스포이드', Icon: Pipette },
] as const;

const shapes = [
	{ tool: 'rect', label: '사각형', Icon: Square },
	{ tool: 'ellipse', label: '타원', Icon: Ellipse },
	{ tool: 'line', label: '직선', Icon: Slash },
	{ tool: 'curve', label: '곡선', Icon: Spline },
] as const;
const toolGroups = [
	{ label: '그리기 도구', tools: paintTools },
	{ label: '도형', tools: shapes },
];
const minWidth = 1;
const maxWidth = 50;

const buttonClass = 'rounded border px-2 py-1 text-xs disabled:opacity-40';
const inactive =
	' border-slate-700 bg-slate-800 enabled:hover:border-sky-400 enabled:hover:text-white';
const active = ' border-sky-400 bg-sky-600 text-white';

export function DrawingToolbar({
	brush,
	set,
	canEdit,
	undo,
	clear,
	canSave,
	onSave,
	copyLabel,
	onCopy,
	onPaste,
}: {
	brush: Brush;
	set: (b: Brush) => void;
	canEdit: boolean;
	undo: (redo?: boolean) => void;
	clear: () => void;
	canSave: boolean;
	onSave: () => void;
	copyLabel: string;
	onCopy?: () => void;
	onPaste?: () => void;
}) {
	const [widthDraft, setWidthDraft] = useState<string | null>(null);
	const [opacityDraft, setOpacityDraft] = useState<string | null>(null);
	const opacity = Math.round(brush.alpha * 100);

	return (
		<div className="space-y-2">
			<div className="grid grid-cols-8 gap-2">
				<button
					className={
						buttonClass + inactive + ' flex items-center justify-center !px-1'
					}
					disabled={!canEdit}
					type="button"
					onClick={() => undo()}
					title="실행 취소"
				>
					<Undo2 size={16} aria-hidden="true" />
				</button>
				<button
					className={
						buttonClass + inactive + ' flex items-center justify-center !px-1'
					}
					disabled={!canEdit}
					type="button"
					title="다시 실행"
					onClick={() => undo(true)}
				>
					<Redo2 size={16} aria-hidden="true" />
				</button>
				<button
					className={
						buttonClass + inactive + ' flex items-center justify-center !px-1'
					}
					type="button"
					aria-label={copyLabel}
					title={copyLabel}
					disabled={!onCopy}
					onClick={onCopy}
				>
					<Copy size={16} aria-hidden="true" />
				</button>
				<button
					className={
						buttonClass + inactive + ' flex items-center justify-center !px-1'
					}
					type="button"
					aria-label="복사한 그림 붙여넣기"
					title="복사한 그림 붙여넣기"
					disabled={!onPaste}
					onClick={onPaste}
				>
					<ClipboardPaste size={16} aria-hidden="true" />
				</button>
				<button
					className={buttonClass + inactive + ' col-span-2'}
					disabled={!canEdit}
					type="button"
					onClick={clear}
				>
					초기화
				</button>
				<button
					className={
						buttonClass +
						' col-span-2 border-sky-500/40 bg-sky-600/20 font-semibold text-sky-300 enabled:hover:bg-sky-600 enabled:hover:text-white'
					}
					disabled={!canSave}
					type="button"
					onClick={onSave}
				>
					저장
				</button>
			</div>

			<div className="flex flex-row items-center gap-1.5">
				<button
					className={
						'grid size-8 place-items-center rounded border' +
						(brush.tool === 'select' ? active : inactive)
					}
					type="button"
					aria-label="범위 선택·이동"
					title="범위 선택·이동"
					aria-pressed={brush.tool === 'select'}
					onClick={() => set({ ...brush, tool: 'select' })}
				>
					<SquareDashed size={16} aria-hidden="true" />
				</button>
				{toolGroups.map((group) => (
					<div
						key={group.label}
						className="grid grid-cols-2 gap-1"
						role="group"
						aria-label={group.label}
					>
						{group.tools.map(({ tool, label, Icon }) => (
							<button
								className={
									'grid size-7 place-items-center rounded border' +
									(brush.tool === tool ? active : inactive)
								}
								type="button"
								key={tool}
								aria-label={label}
								title={label}
								aria-pressed={brush.tool === tool}
								onClick={() => set({ ...brush, tool })}
							>
								<Icon size={16} aria-hidden="true" />
							</button>
						))}
					</div>
				))}
				<div className="grid min-w-20 flex-1 gap-1 text-xs">
					<div className="flex items-center justify-between gap-1">
						<span>두께</span>
						<input
							aria-label="두께 (픽셀)"
							className="w-13 rounded-lg border border-slate-700 bg-slate-900 px-1 py-0.5 text-white focus:border-sky-500 focus:outline-none"
							type="number"
							min={minWidth}
							max={maxWidth}
							step={1}
							value={widthDraft ?? brush.width}
							onChange={(e) => {
								setWidthDraft(e.target.value);
								const width = e.target.valueAsNumber;
								if (
									Number.isInteger(width) &&
									width >= minWidth &&
									width <= maxWidth
								) {
									set({ ...brush, width });
								}
							}}
							onBlur={(e) => {
								const width = e.target.valueAsNumber;
								if (Number.isFinite(width)) {
									set({
										...brush,
										width: Math.min(
											maxWidth,
											Math.max(minWidth, Math.round(width)),
										),
									});
								}
								setWidthDraft(null);
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter') e.currentTarget.blur();
							}}
						/>
					</div>
					<input
						aria-label="두께 슬라이더"
						className="w-full"
						type="range"
						min={minWidth}
						max={maxWidth}
						value={brush.width}
						onChange={(e) => {
							setWidthDraft(null);
							set({ ...brush, width: e.target.valueAsNumber });
						}}
					/>
					<button
						className={buttonClass + (brush.filled ? active : inactive)}
						type="button"
						aria-pressed={brush.filled}
						onClick={() => set({ ...brush, filled: !brush.filled })}
					>
						도형 채우기
					</button>
				</div>
			</div>

			<div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-3 text-xs">
				<label className="gap-1 flex flex-row items-center">
					색
					<input
						className="h-6 w-9"
						type="color"
						value={brush.color}
						onChange={(e) => set({ ...brush, color: e.target.value })}
					/>
				</label>
				<div className="flex min-w-0 items-center gap-1 whitespace-nowrap">
					<label className="flex items-center gap-1">
						불투명도
						<input
							aria-label="불투명도 (%)"
							className="w-13 rounded-lg border border-slate-700 bg-slate-900 px-1 py-0.5 text-white focus:border-sky-500 focus:outline-none"
							type="number"
							min={0}
							max={100}
							step={1}
							value={opacityDraft ?? opacity}
							onChange={(e) => {
								setOpacityDraft(e.target.value);
								const value = e.target.valueAsNumber;
								if (Number.isInteger(value) && value >= 0 && value <= 100) {
									set({ ...brush, alpha: value / 100 });
								}
							}}
							onBlur={(e) => {
								const value = e.target.valueAsNumber;
								if (Number.isFinite(value)) {
									set({
										...brush,
										alpha: Math.min(100, Math.max(0, Math.round(value))) / 100,
									});
								}
								setOpacityDraft(null);
							}}
							onKeyDown={(e) => {
								if (e.key === 'Enter') e.currentTarget.blur();
							}}
						/>
						<span aria-hidden="true">%</span>
					</label>
					<input
						aria-label="불투명도 슬라이더"
						className="min-w-0 flex-1"
						type="range"
						min={0}
						max={100}
						step={1}
						value={opacity}
						onChange={(e) => {
							setOpacityDraft(null);
							set({ ...brush, alpha: e.target.valueAsNumber / 100 });
						}}
					/>
				</div>
			</div>

			{canEdit && brush.tool === 'curve' && (
				<p className="text-xs text-slate-400">
					시작점과 끝점을 차례로 클릭한 뒤, 드래그해 곡률을 조절하세요.
				</p>
			)}
			{canEdit && brush.tool === 'select' && (
				<p className="text-xs text-slate-400">
					영역 안을 끌어 이동, 테두리 손잡이로 크기 조절
				</p>
			)}
			{canEdit && brush.tool === 'eyedropper' && (
				<p className="text-xs text-slate-400">
					그림에서 가져올 색을 클릭하세요.
				</p>
			)}
		</div>
	);
}
