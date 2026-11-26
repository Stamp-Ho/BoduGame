'use client';

import { GoldCardData, GoldCardEventType } from '../types';

interface GoldCardManagerProps {
	cards: GoldCardData[];
	availableTiles: { id: string; label: string }[];
	selectingCardId: string | null;
	editingCardId: string | null;
	onEditCard: (cardId: string | null) => boolean;
	onChange: (cards: GoldCardData[]) => void;
	onSelectTarget: (cardId: string) => void;
}

export default function GoldCardManager({
	cards,
	availableTiles,
	selectingCardId,
	editingCardId,
	onEditCard,
	onChange,
	onSelectTarget,
}: GoldCardManagerProps) {
	const updateCard = (cardId: string, patch: Partial<GoldCardData>) => {
		onChange(
			cards.map((card) => (card.id === cardId ? { ...card, ...patch } : card)),
		);
	};

	const updateEvent = (cardId: string, type: GoldCardEventType) => {
		const card = cards.find((item) => item.id === cardId);
		if (!card) return;
		if (type !== 'MOVE_PAWN_SPECIFIED' && selectingCardId === cardId) onSelectTarget(cardId);
		updateCard(cardId, {
			event: {
				type,
				...(type === 'MOVE_PAWN_SPECIFIED'
					? { targetTileId: card.event.targetTileId }
					: {}),
			},
		});
	};

	const addCard = () => {
		const id = `gold_card_${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}_${Math.random().toString(36).slice(2)}`}`;
		if (!onEditCard(id)) return;
		onChange([
			...cards,
			{ id, title: '새 황금 카드', description: '', event: { type: 'TEXT' } },
		]);
	};

	const card = cards.find((item) => item.id === editingCardId);
	if (card) {
		return (
			<section className="shrink-0 rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2">
				<div className="flex items-center justify-between gap-2">
					<h3 className="text-sm font-bold text-amber-200">황금 카드 편집</h3>
					<button
						type="button"
						onClick={() => onEditCard(null)}
						className="rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/20"
					>
						카드 목록으로
					</button>
				</div>
				<div className="mt-3 space-y-2.5">
					<label className="flex flex-row items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-300">
						제목
						<input
							value={card.title}
							onChange={(event) =>
								updateCard(card.id, { title: event.target.value })
							}
							className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
						/>
					</label>
					<label className="flex flex-row items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-300">
						설명
						<textarea
							rows={2}
							value={card.description}
							onChange={(event) =>
								updateCard(card.id, { description: event.target.value })
							}
							className="w-full resize-y rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
							placeholder="카드에 표시할 내용"
						/>
					</label>
					<label className="flex flex-row items-center gap-2 whitespace-nowrap text-[11px] font-semibold text-slate-300">
						효과
						<select
							value={card.event.type}
							onChange={(event) =>
								updateEvent(
									card.id,
									event.target.value as GoldCardEventType,
								)
							}
							className="w-full rounded border border-slate-700 bg-slate-950 px-2 py-1.5 text-xs text-white"
						>
							<option value="TEXT">일반 텍스트 (바닐라)</option>
							<option value="MOVE_PAWN_SPECIFIED">
								폰 위치 이동 (지정)
							</option>
							<option value="MOVE_PAWN_CHOOSE">
								폰 위치 이동 (선택)
							</option>
							<option value="SWAP_POSITIONS_CHOOSE">
								상호 위치 교환 (선택)
							</option>
						</select>
					</label>
					{card.event.type === 'MOVE_PAWN_SPECIFIED' && (
						<div className="space-y-1">
							<button
								type="button"
								onClick={() => onSelectTarget(card.id)}
								className={`w-full rounded border px-2 py-1.5 text-left text-xs ${selectingCardId === card.id ? 'border-amber-300 bg-amber-400/20 text-amber-100' : 'border-slate-700 bg-slate-950 text-slate-200 hover:border-amber-400'}`}
							>
								{selectingCardId === card.id
									? '보드에서 이동할 칸을 클릭하세요'
									: (availableTiles.find(
											(tile) => tile.id === card.event.targetTileId,
										)?.label ?? '이동할 칸 선택')}
							</button>
							{card.event.targetTileId && (
								<p className="text-[10px] text-slate-500">
									대상: {card.event.targetTileId}
								</p>
							)}
						</div>
					)}
				</div>
			</section>
		);
	}

	return (
		<section className="flex min-h-28 flex-1 flex-col gap-3 overflow-hidden rounded-xl border border-amber-500/30 bg-amber-950/20 px-3 py-2">
			<div className="shrink-0">
				<div className="flex items-center justify-between gap-2">
					<h3 className="text-sm font-bold text-amber-200">황금 카드 덱</h3>
					<button
						type="button"
						onClick={addCard}
						className="shrink-0 rounded-lg border border-amber-400/40 bg-amber-400/10 px-2.5 py-1.5 text-xs font-bold text-amber-200 hover:bg-amber-400/20"
					>
						카드 추가
					</button>
				</div>
				<p className="mt-1 text-[10px] text-slate-400">
					뽑은 카드는 덱을 한 바퀴 돌 때까지 다시 나오지 않습니다.
				</p>
			</div>
			{cards.length === 0 ? (
				<p className="rounded-lg border border-dashed border-slate-700 p-3 text-center text-xs text-slate-400">
					덱이 비어 있습니다. 카드를 추가해 주세요.
				</p>
			) : (
				<ul className="min-h-0 flex-1 space-y-2 overflow-y-auto">
					{cards.map((item, index) => (
						<li key={item.id} className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/80 px-2.5 py-1.5">
							<button
								type="button"
								aria-label={(item.title || '카드 ' + (index + 1)) + ' 수정'}
								title="카드 수정"
								onClick={() => onEditCard(item.id)}
								className="min-w-0 flex-1 break-words text-left text-xs font-bold text-amber-100 hover:text-white"
							>
								{item.title || '카드 ' + (index + 1)}
							</button>
							<button
								type="button"
								onClick={() => onChange(cards.filter((entry) => entry.id !== item.id))}
								className="shrink-0 rounded border border-red-500/30 px-2 py-1 text-[10px] font-semibold text-red-300 hover:bg-red-500/10"
							>
								카드 삭제
							</button>
						</li>
					))}
				</ul>
			)}
		</section>
	);
}
