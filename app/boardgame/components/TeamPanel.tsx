import type { BoardTileData } from '../types/board';
import type { GamePlayDomain } from '../types/DiceArenaProps';
import { DEFAULT_TEAM_NAMES } from '../utils/arena';

type Props = { game: GamePlayDomain; tiles: Map<string, BoardTileData>; disabled: boolean };

export default function TeamPanel({ game: { state, actions }, tiles, disabled }: Props) {
	return (
		<section className="rounded-xl border border-slate-700 bg-slate-950/50 p-3">
			<div className="mb-3 flex flex-wrap items-center justify-between gap-2">
				<h3 className="text-xs font-bold text-white">참가 팀</h3>
				<div role="group" aria-label="참가 팀 수" className="flex gap-1">
					{DEFAULT_TEAM_NAMES.map((_, index) => {
						const count = index + 1;
						return <button key={count} type="button" disabled={disabled}
							aria-pressed={state.teams.length === count} onClick={() => actions.onChangeTeamCount(count)}
							className="rounded-md border border-slate-700 px-2 py-1 text-xs text-slate-300 aria-pressed:border-sky-400 aria-pressed:bg-sky-950 aria-pressed:text-white disabled:opacity-50">
							{count}팀
						</button>;
					})}
				</div>
			</div>
			<ul className="space-y-2">
				{state.teams.map((team, index) => {
					const tileId = state.teamTileIds[index];
					const position = tileId?.startsWith('inner_') ? tiles.get(tileId)?.label || tileId : `${state.teamPositions[index]}번`;
					return <li key={index} aria-current={index === state.currentTeamIndex}
						className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-900/60 px-3 py-2 aria-[current=true]:border-sky-400/50 aria-[current=true]:bg-sky-400/10">
						<span className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ backgroundColor: team.color }} />
						{state.hasRolledThisGame ? <span className="min-w-0 flex-1 truncate text-xs font-semibold">{team.name}</span> : (
							<input aria-label={`${index + 1}팀 이름`} maxLength={24} value={team.name}
								onChange={event => actions.onChangeTeamName(index, event.target.value)}
								className="min-w-0 flex-1 rounded border border-slate-700 bg-slate-950 px-2 py-1 text-xs font-semibold text-slate-100" />
						)}
						<span className="text-xs font-bold text-slate-400">{position}</span>
					</li>;
				})}
			</ul>
		</section>
	);
}
