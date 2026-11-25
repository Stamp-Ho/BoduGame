'use client';

import { useState, type FormEvent } from 'react';
import { createBoardgame } from '../actions';

export default function BoardgameCreateModal({
	onClose,
	onCreated,
}: {
	onClose: () => void;
	onCreated: (game: import("../types/session").CreatedBoard) => void;
}) {
	const [name, setName] = useState('새 주루마블');
	const [rows, setRows] = useState('8');
	const [cols, setCols] = useState('10');
	const [error, setError] = useState('');
	const [isSubmitting, setIsSubmitting] = useState(false);

	const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setIsSubmitting(true);
		setError('');
		const result = await createBoardgame({
			name,
			gridRows: Number(rows),
			gridCols: Number(cols),
		});
		setIsSubmitting(false);
		if (!result.success) {
			setError(result.message);
			return;
		}
		onCreated(result.data);
		onClose();
	};

	return (
		<div className="fixed inset-0 z-[80] flex items-center justify-center bg-[#13271f]/80 p-4">
			<form
				onSubmit={(event) => void handleSubmit(event)}
				className="w-full max-w-md space-y-4 rounded-2xl border border-[#c9cec3] bg-[#fffefa] p-5 shadow-2xl"
			>
				<div>
					<h2 className="whitespace-pre-wrap text-lg font-bold text-[#1f342e]">새 주루마블 생성</h2>
					<p className="mt-1 whitespace-pre-wrap text-sm text-[#52675e]">
						생성 후 보드 편집 화면으로 이동합니다.
					</p>
				</div>
				<label className="block space-y-1.5 text-sm font-semibold text-[#52675e]">
					<span>주루마블 이름</span>
					<input
						autoFocus
						maxLength={80}
						value={name}
						onChange={(event) => setName(event.target.value)}
						className="w-full rounded-lg border border-[#c9cec3] bg-[#f7f5ed] px-3 py-2.5 text-sm text-[#1f342e] outline-none focus:border-[#25463b]"
					/>
				</label>
				<div className="grid grid-cols-2 gap-3">
					<label className="space-y-1.5 text-sm font-semibold text-[#52675e]">
						<span>행 (3–20)</span>
						<input
							type="number"
							min={3}
							max={20}
							step={1}
							value={rows}
							onChange={(event) => setRows(event.target.value)}
							className="w-full rounded-lg border border-[#c9cec3] bg-[#f7f5ed] px-3 py-2.5 text-sm text-[#1f342e] outline-none focus:border-[#25463b]"
						/>
					</label>
					<label className="space-y-1.5 text-sm font-semibold text-[#52675e]">
						<span>열 (3–20)</span>
						<input
							type="number"
							min={3}
							max={20}
							step={1}
							value={cols}
							onChange={(event) => setCols(event.target.value)}
							className="w-full rounded-lg border border-[#c9cec3] bg-[#f7f5ed] px-3 py-2.5 text-sm text-[#1f342e] outline-none focus:border-[#25463b]"
						/>
					</label>
				</div>
				{error && <p className="whitespace-pre-wrap text-sm text-red-700">{error}</p>}
				<div className="flex justify-end gap-2 border-t border-[#d8dacf] pt-3">
					<button
						type="button"
						disabled={isSubmitting}
						onClick={onClose}
						className="rounded-lg border border-[#c9cec3] px-4 py-2 text-sm font-semibold text-[#52675e] hover:bg-[#eeeee4] disabled:opacity-50"
					>
						취소
					</button>
					<button
						type="submit"
						disabled={isSubmitting || !name.trim()}
						className="rounded-lg bg-[#1f342e] text-white px-4 py-2 text-sm font-bold text-[#1f342e] hover:bg-[#25463b] disabled:opacity-50"
					>
						{isSubmitting ? '생성 중…' : '주루마블 생성'}
					</button>
				</div>
			</form>
		</div>
	);
}
