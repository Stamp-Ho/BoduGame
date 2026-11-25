import { useCallback, useEffect, useRef, type RefObject } from 'react';
import type { ArenaRuntime } from '../types/arena';
import type { BoardTileData } from '../types/board';
import { returnToPreRollView } from '../utils/arenaControls';

type Arrival = {
	runtime: ArenaRuntime;
	tile: BoardTileData | null;
	returned: boolean;
	afterReturn?: () => void;
};

export function useTileArrival(
	runtimeRef: RefObject<ArenaRuntime | null>,
	selectTileRef: RefObject<(tileId: string | null) => void>,
	setPending: (tile: BoardTileData | null) => void,
	setMoving: (moving: boolean) => void,
) {
	const current = useRef<Arrival | null>(null);
	const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
	const cancel = useCallback(() => {
		if (timer.current !== null) clearTimeout(timer.current);
		timer.current = null;
		current.current = null;
	}, []);
	useEffect(() => cancel, [cancel]);

	const present = useCallback((runtime: ArenaRuntime, tile: BoardTileData | null) => {
		cancel();
		const arrival: Arrival = { runtime, tile, returned: false };
		current.current = arrival;
		setPending(tile);
		timer.current = setTimeout(() => {
			timer.current = null;
			if (runtimeRef.current !== runtime || current.current !== arrival) return;
			selectTileRef.current(null);
			runtime.pawnMeshes.forEach(mesh => mesh.scale.set(1, 1, 1));
			returnToPreRollView(runtime.orbit, () => {
				if (current.current !== arrival || runtimeRef.current !== runtime) return;
				runtime.orbit.preRollView = null;
				arrival.returned = true;
				setMoving(false);
				arrival.afterReturn?.();
			});
		}, 1000);
	}, [cancel, runtimeRef, selectTileRef, setMoving, setPending]);

	const confirm = useCallback((tile: BoardTileData, apply: () => void) => {
		const arrival = current.current;
		if (!arrival || arrival.runtime !== runtimeRef.current || arrival.tile !== tile) return;
		arrival.tile = null;
		setPending(null);
		if (arrival.returned) apply();
		else arrival.afterReturn = apply;
	}, [runtimeRef, setPending]);

	return { present, confirm, cancel };
}
