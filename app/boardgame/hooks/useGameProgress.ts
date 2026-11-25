import { useEffect, useRef, useState } from 'react';
import { DiceArenaTeamInfo } from '../types/DiceArenaProps';
import { DEFAULT_TEAM_NAMES, TEAM_COLORS, isTeamCount } from '../utils/arena';
import { saveGameProgress } from '../utils/gameProgress';

/**
 * 보드게임 진행 상태(팀 이름·위치·현재 턴·점수·주사위 개수)와
 * 이를 보드게임별로 localStorage에 저장하는 동작을 관리한다.
 * 애니메이션 루프·이벤트 핸들러에서 최신 값을 읽을 수 있도록 일부 값은 ref도 함께 둔다.
 */
export function useGameProgress(activeBoardgameId: string | null) {
	const [scores, setScores] = useState<number[]>([]);
	const [hasRolledThisGame, setHasRolledThisGame] = useState(false);
	const hasRolledThisGameRef = useRef(false);
	const [diceCount, setDiceCount] = useState(1);
	const diceCountRef = useRef(1);
	const [playerTileIndex, setPlayerTileIndex] = useState<number>(0);
	const playerTileIndexRef = useRef(0);
	const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
	const currentTeamIndexRef = useRef(0);
	const [teamSkipTurns, setTeamSkipTurns] = useState<number[]>([0, 0, 0, 0]);
	const teamSkipTurnsRef = useRef(teamSkipTurns);
	const [teamPositions, setTeamPositions] = useState<number[]>([0, 0, 0, 0]);
	const teamPositionsRef = useRef<number[]>([0, 0, 0, 0]);
	const [teamTileIds, setTeamTileIds] = useState<string[]>([
		'outer_0',
		'outer_0',
		'outer_0',
		'outer_0',
	]);
	const teamTileIdsRef = useRef(teamTileIds);
	const [teamNames, setTeamNames] = useState<string[]>(DEFAULT_TEAM_NAMES);
	const [teamCount, setActiveCount] = useState(DEFAULT_TEAM_NAMES.length);
	const teamCountRef = useRef(teamCount);
	const setTeamCount = (count: number) => {
		if (!isTeamCount(count)) return;
		teamCountRef.current = count;
		setActiveCount(count);
		if (currentTeamIndexRef.current >= count) {
			currentTeamIndexRef.current = 0;
			setCurrentTeamIndex(0);
			playerTileIndexRef.current = teamPositionsRef.current[0];
			setPlayerTileIndex(playerTileIndexRef.current);
		}
	};
	const loadedProgressBoardgameIdRef = useRef<string | null>(null);
	const teams: DiceArenaTeamInfo[] = teamNames.slice(0, teamCount).map((name, index) => ({
		name,
		color: TEAM_COLORS[index],
	}));

	useEffect(() => {
		if (
			!activeBoardgameId ||
			loadedProgressBoardgameIdRef.current !== activeBoardgameId
		)
			return;
		saveGameProgress(activeBoardgameId, {
			teamCount,
			teamNames,
			teamPositions: teamPositionsRef.current,
			teamTileIds,
			currentTeamIndex,
			teamSkipTurns,
			hasRolled: hasRolledThisGame,
			scores,
		});
	}, [
		activeBoardgameId,
		teamCount,
		currentTeamIndex,
		teamSkipTurns,
		hasRolledThisGame,
		scores,
		teamNames,
		teamTileIds,
		teamPositions,
	]);

	// 모든 팀을 출발 칸으로 되돌리고 현재 턴·점수를 초기화
	const resetTeamsToStart = (startTileId: string) => {
		teamPositionsRef.current = DEFAULT_TEAM_NAMES.map(() => 0);
		teamTileIdsRef.current = DEFAULT_TEAM_NAMES.map(() => startTileId);
		setTeamTileIds([...teamTileIdsRef.current]);
		setTeamPositions([...teamPositionsRef.current]);
		currentTeamIndexRef.current = 0;
		setCurrentTeamIndex(0);
		teamSkipTurnsRef.current = DEFAULT_TEAM_NAMES.map(() => 0);
		setTeamSkipTurns([...teamSkipTurnsRef.current]);
		playerTileIndexRef.current = 0;
		setPlayerTileIndex(0);
		setScores([]);
	};

	return {
		teamCount,
		teamCountRef,
		setTeamCount,
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
		teamNames,
		setTeamNames,
		teams,
		loadedProgressBoardgameIdRef,
		resetTeamsToStart,
	};
}
