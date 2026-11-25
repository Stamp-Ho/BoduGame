import type { GameState } from "./rules";
export type FinishedDetail = Pick<
  GameState,
  | "players"
  | "winner"
  | "results"
  | "config"
  | "winReason"
  | "assassinated"
  | "voteHistory"
  | "bestPlayerVotes"
  | "publicEvents"
  | "plotHands"
>;
export type Actor = { id: string; name: string };
export type Result<T> = { ok: true; data: T } | { ok: false; error: string };
export type AvalonRoomSummary = {
  id: string;
  title: string;
  players: number;
  use_real_names: boolean;
  is_private: boolean;
  phase: string;
};
export type AvalonPlayerStats = {
  playerId: string;
  playerName: string;
  games: number;
  wins: number;
  goodGames: number;
  goodWins: number;
  evilGames: number;
  evilWins: number;
};
export type AvalonSideStats = {
  games: number;
  goodWins: number;
  evilWins: number;
};
export type AvalonGamePlayerRecord = {
  playerId: string;
  playerName: string;
  side: string;
  won: boolean;
  bestPlayerVotes: number;
};
export type AvalonGameRecord = {
  gameId: string;
  completedAt: string;
  roomId: string;
  players: AvalonGamePlayerRecord[];
};
export type AvalonGameDetail = {
  gameId: string;
  completedAt: string;
  state: FinishedDetail | null;
  players: AvalonGamePlayerRecord[];
};
