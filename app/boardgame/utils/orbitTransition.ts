import type { ArenaOrbitState, OrbitSnapshot } from '../types/arena';

type Pose = Pick<OrbitSnapshot, 'center' | 'theta' | 'phi' | 'radius'>;

const duration = 0.45;

export function transitionOrbit(orbit: ArenaOrbitState, to: Pose, onArrive: () => void) {
	orbit.transition = {
		from: { center: orbit.center.clone(), theta: orbit.theta, phi: orbit.phi, radius: orbit.radius },
		elapsed: 0,
		onArrive,
	};
	orbit.targetCenter.copy(to.center);
	orbit.targetTheta = to.theta;
	orbit.targetPhi = to.phi;
	orbit.targetRadius = to.radius;
}

export function stepOrbitTransition(orbit: ArenaOrbitState, dt: number) {
	const transition = orbit.transition;
	if (!transition) return;
	transition.elapsed += dt;
	const progress = Math.min(1, transition.elapsed / duration);
	const ease = progress * progress * (3 - 2 * progress);
	const { from } = transition;
	const angle = orbit.targetTheta - from.theta;
	orbit.theta = from.theta + Math.atan2(Math.sin(angle), Math.cos(angle)) * ease;
	orbit.phi = from.phi + (orbit.targetPhi - from.phi) * ease;
	orbit.radius = from.radius + (orbit.targetRadius - from.radius) * ease;
	orbit.center.lerpVectors(from.center, orbit.targetCenter, ease);
	if (progress === 1) {
		orbit.theta = orbit.targetTheta;
		orbit.transition = null;
		transition.onArrive();
	}
}
