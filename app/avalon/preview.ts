import "server-only";
import { initialState, publicView } from "./engine";
import { defaultConfig, type GameState, type Phase } from "./rules";
import { PREVIEW_NAMES, PREVIEW_FALLBACK_IDS } from "./previewData";
type User = { id: string; name: string };
type PreviewScreen = 'reveal' | 'propose' | 'excalibur_assign' | 'vote' | 'reselect_after_rejection' | 'quest' | 'excalibur' | 'gawain_check' | 'lady' | 'assassinate' | 'best_player_vote' | 'finished';
export const previewPhases: { screen: PreviewScreen; label: string }[] = [
  { screen: 'reveal', label: '역할 확인' },
  { screen: 'propose', label: '팀 제안' }, { screen: 'vote', label: '팀 투표' }, { screen: 'excalibur_assign', label: '투표 승인 후 엑스칼리버 수여' },
  { screen: 'reselect_after_rejection', label: '부결 투표 후 재선정' },
  { screen: 'quest', label: '원정 카드' }, { screen: 'excalibur', label: '엑스칼리버' }, { screen: 'gawain_check', label: '가웨인 판정' }, { screen: 'lady', label: '호수의 여인' },
  { screen: 'assassinate', label: '암살자 암살 턴' },
  { screen: 'best_player_vote', label: '승패 확정 후 베스트 플레이어 투표' },
  { screen: 'finished', label: '게임 결과' },
];

function previewState(screen: PreviewScreen, people: User[], rejectedAt: string | null = null): GameState {
  const phase: Phase = screen === 'reselect_after_rejection' ? 'propose' : screen;
  const [self, second, third, fourth, fifth, sixth, seventh, eighth] = people;
  const state = initialState(self);
  state.players = [
    { ...self, seat: 0, roles: ["gawain"], side: 'good', currentSide: 'good', ready: true, seen: true },
    { ...second, seat: 1, roles: ['good_lancelot'], side: 'good', currentSide: 'evil', ready: true, seen: true },
    { ...third, seat: 2, roles: ['isolde'], side: 'good', currentSide: 'good', ready: true, seen: true },
    { ...fourth, seat: 3, roles: ['assassin'], side: 'evil', currentSide: 'evil', ready: true, seen: true },
    { ...fifth, seat: 4, roles: ['evil_lancelot'], side: 'evil', currentSide: 'good', ready: true, seen: true },
    { ...sixth, seat: 5, roles: ['tristan'], side: 'good', currentSide: 'good', ready: true, seen: true },
    { ...seventh, seat: 6, roles: ['mordred'], side: 'evil', currentSide: 'evil', ready: true, seen: true },
    { ...eighth, seat: 7, roles: ['merlin'], side: 'good', currentSide: 'good', ready: true, seen: true }
  ];
  state.config = { ...defaultConfig(8), expansion: true, lady: true, lancelot: 'variant1', goodSlots: [['gawain'], ['good_lancelot'], ['isolde'], ['tristan'], ['merlin']], evilSlots: [['assassin'], ['evil_lancelot'], ['mordred']] };
  if (phase === 'quest') {
    state.players[0].roles = ['good_sorcerer'];
    state.players[3].roles.push('evil_sorcerer');
    state.config.goodSlots[0] = ['good_sorcerer'];
    state.config.evilSlots[0].push('evil_sorcerer');
  }
  if (screen === 'excalibur_assign') state.config.excalibur = true;
  state.phase = phase;
  state.mission = 3;
  const secondVote = { [self.id]: true, [second.id]: false, [third.id]: true, [fourth.id]: false, [fifth.id]: true, [sixth.id]: true, [seventh.id]: false, [eighth.id]: true };
  const thirdVote = { [self.id]: true, [second.id]: true, [third.id]: true, [fourth.id]: false, [fifth.id]: false, [sixth.id]: true, [seventh.id]: false, [eighth.id]: true };
  const rejectedVote = { [self.id]: true, [second.id]: false, [third.id]: true, [fourth.id]: false, [fifth.id]: false, [sixth.id]: true, [seventh.id]: false, [eighth.id]: false };
  const fourthVote = { [self.id]: true, [second.id]: true, [third.id]: true, [fourth.id]: false, [fifth.id]: false, [sixth.id]: true, [seventh.id]: false, [eighth.id]: true };
  const fifthVote = { [self.id]: true, [second.id]: false, [third.id]: true, [fourth.id]: false, [fifth.id]: true, [sixth.id]: true, [seventh.id]: false, [eighth.id]: true };
  const secondTeam = [second.id, fourth.id, fifth.id, seventh.id];
  const thirdTeam = [self.id, second.id, third.id, sixth.id];
  const gawainTeam = [second.id, third.id, fourth.id, sixth.id];
  const fourthTeam = [self.id, second.id, third.id, fourth.id, eighth.id];
  const fifthTeam = [self.id, third.id, fifth.id, sixth.id, eighth.id];
  state.results = [
    { number: 1, team: [self.id, third.id, eighth.id], success: true, cards: ['success', 'success', 'success'], failCount: 0, vote: {}, leaderId: self.id },
    { number: 2, team: secondTeam, success: false, cards: ['success', 'fail', 'success', 'success'], failCount: 1, vote: secondVote, leaderId: second.id },
  ];
  state.voteHistory = [{ mission: 2, team: secondTeam, votes: secondVote, approved: true, leaderId: second.id }];
  if (phase === 'quest' || phase === 'assassinate' || phase === 'best_player_vote' || phase === 'finished') state.voteHistory.push({ mission: 3, team: thirdTeam, votes: thirdVote, approved: true, leaderId: self.id,
    excaliburHolder: phase === 'assassinate' || phase === 'best_player_vote' || phase === 'finished' ? sixth.id : null });
  if (phase === 'gawain_check') {
    state.players[1].roles.push('good_sorcerer');
    state.players[3].roles.push('evil_sorcerer');
    state.config.goodSlots[1].push('good_sorcerer');
    state.config.evilSlots[0].push('evil_sorcerer');
    state.voteHistory.push({ mission: 3, team: gawainTeam, votes: thirdVote, approved: true, leaderId: third.id });
    state.results.push({ number: 3, team: gawainTeam, success: false, cards: ['success', 'success', 'magic', 'success'], failCount: 0, vote: thirdVote, leaderId: third.id });
    state.proposal = gawainTeam;
    state.cards = { [second.id]: 'success', [third.id]: 'success', [fourth.id]: 'magic', [sixth.id]: 'success' };
    state.submittedCards = { ...state.cards };
  }
  if (phase === 'excalibur') {
    state.players[1].roles.push('good_sorcerer');
    state.players[3].roles.push('evil_sorcerer');
    state.config.goodSlots[1].push('good_sorcerer');
    state.config.evilSlots[0].push('evil_sorcerer');
    state.config.excalibur = true;
    state.leaderSeat = 2;
    state.proposal = [self.id, second.id, third.id, fourth.id];
    state.excaliburHolder = self.id;
    state.cards = { [self.id]: 'success', [second.id]: 'magic', [third.id]: 'success', [fourth.id]: 'success' };
    state.submittedCards = { ...state.cards };
    state.votes = thirdVote;
    state.voteHistory.push({ mission: 3, team: [...state.proposal], votes: thirdVote, approved: true, leaderId: third.id, excaliburHolder: self.id });
  }
  if (phase === 'excalibur_assign') {
    state.proposal = thirdTeam;
    state.votes = thirdVote;
    state.voteHistory.push({ mission: 3, team: thirdTeam, votes: thirdVote, approved: true, leaderId: self.id, excaliburHolder: null });
  }
  if (phase === 'reveal') { state.players[1].seen = false; state.players[3].seen = false; }
  if (phase === 'vote') state.votes = { [second.id]: false, [third.id]: true };
  state.lancelotCards = [true, false, false, false, false, false, true];
  state.lancelotApplied = [2];
  state.publicEvents = ['1차 원정 성공', '2차 원정 실패', '2차 원정 후 랜슬롯 충성심 카드: 진영 전환'];
  state.history = [
    { type: 'quest', index: 0 }, { type: 'event', index: 0 },
    { type: 'vote', index: 0 }, { type: 'quest', index: 1 },
    { type: 'event', index: 1 }, { type: 'event', index: 2 },
    ...(phase === 'quest' || phase === 'assassinate' || phase === 'best_player_vote' || phase === 'finished' || phase === 'gawain_check' || phase === 'excalibur' || phase === 'excalibur_assign' ? [{ type: 'vote' as const, index: 1 }] : []),
    ...(phase === 'gawain_check' ? [{ type: 'quest' as const, index: 2 }] : []),
  ];
  state.ladyHolder = self.id;
  state.ladyUsed = [second.id];
  if (phase !== 'gawain_check' && phase !== 'excalibur' && phase !== 'excalibur_assign') state.proposal = thirdTeam;
  if (phase === 'propose') state.proposal = [];
  if (screen === 'reselect_after_rejection') {
    state.leaderSeat = 2;
    state.rejected = 1;
    state.rejectedVoteAt = rejectedAt;
    state.votes = rejectedVote;
    state.voteHistory.push({ mission: 3, team: thirdTeam, votes: rejectedVote, approved: false, leaderId: second.id });
    state.publicEvents.push('3차 팀 투표 부결 (1/5)');
    state.history.push({ type: 'vote', index: 1 }, { type: 'event', index: 3 });
  }
  if (phase === 'assassinate' || phase === 'best_player_vote' || phase === 'finished') {
    state.config.excalibur = true;
    state.voteHistory.push(
      { mission: 4, team: fourthTeam, votes: fourthVote, approved: true, leaderId: third.id },
      { mission: 5, team: fifthTeam, votes: fifthVote, approved: true, leaderId: sixth.id },
    );
    state.results.push(
      { number: 3, team: thirdTeam, success: true, cards: ['success', 'success', 'success', 'success'], failCount: 0, vote: thirdVote, leaderId: self.id, excaliburHolder: sixth.id, excaliburTarget: second.id },
      { number: 4, team: fourthTeam, success: false, cards: ['success', 'fail', 'success', 'fail', 'success'], failCount: 2, vote: fourthVote, leaderId: third.id },
      { number: 5, team: fifthTeam, success: true, cards: ['success', 'success', 'success', 'success', 'success'], failCount: 0, vote: fifthVote, leaderId: sixth.id },
    );
    state.mission = 5;
    state.leaderSeat = 5;
    state.proposal = fifthTeam;
    state.history.push({ type: 'quest', index: 2 }, { type: 'vote', index: 2 }, { type: 'quest', index: 3 }, { type: 'vote', index: 3 }, { type: 'quest', index: 4 });
  }
  if (phase === 'best_player_vote' || phase === 'finished') {
    state.winner = 'good'; state.winReason = '멀린 암살 실패'; state.assassinated = [third.id];
  }
  if (phase === 'best_player_vote') state.bestPlayerVotes = { [second.id]: third.id, [fourth.id]: null };
  return state;
}

export function getPreview(screen: string) {
 const selected = previewPhases.find(item => item.screen === screen)?.screen ?? "propose";
 const people = PREVIEW_NAMES.map((name,index) => ({id:PREVIEW_FALLBACK_IDS[index],name}));
 const actor = people[selected === "assassinate" ? 3 : selected === "reselect_after_rejection" ? 2 : 0];
 const state = previewState(selected, people, new Date().toISOString());
 return {user:actor, view:{...publicView(state,actor.id),roomTitle:"아발론 미리보기",isPrivate:false,useRealNames:false,joinCode:null,needsConsent:false}};
}
