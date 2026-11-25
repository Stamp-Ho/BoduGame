import { type Card, type Config, type PlotCard } from "./rules";

export type View = Awaited<ReturnType<typeof import("./room-data").roomView>>;

export type User = { id: string; name: string };

export type AssassinationKind = "merlin" | "messengers" | "lovers";

export const cardName: Record<Card, string> = {
  success: "성공",
  fail: "실패",
  magic: "마법",
  good_message: "선 전령",
  evil_message: "악 전령",
  good_rogue: "선 도적",
  evil_rogue: "악 도적",
};

export const gawainPeekLabel = (unplayedCard: Card) =>
  `내지 않은 카드: ${cardName[unplayedCard]}`;

export function visibleQuestCards(config: Config): Card[] {
  const roles = new Set(config.goodSlots.concat(config.evilSlots).flat());
  const cards: Card[] = ["success", "fail"];
  if (roles.has("good_messenger_senior") || roles.has("good_messenger_junior"))
    cards.push("good_message");
  if (roles.has("evil_messenger")) cards.push("evil_message");
  if (roles.has("good_rogue")) cards.push("good_rogue");
  if (roles.has("evil_rogue")) cards.push("evil_rogue");
  return cards;
}

export function questCardToSubmit(
  selected: Card,
  allowed: Card[],
): Card | undefined {
  if (selected === "fail" && allowed.includes("magic")) return "magic";
  if (allowed.includes(selected)) return selected;
  return allowed.includes("success")
    ? "success"
    : allowed.includes("fail")
      ? "fail"
      : allowed[0];
}

export const plotName: Record<PlotCard, string> = {
  are_you_the_one: "Are You the One?",
  charge: "Charge!",
  show_your_strength: "Show Your Strength",
  show_your_true_nature: "Show Your True Nature",
  king_returns: "The King Returns",
  ambush: "Ambush",
  lead_to_victory: "Lead to Victory",
  we_found_you: "We Found You!",
  restore_your_honor: "Restore Your Honor",
};

export const field =
  "rounded-xl border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-violet-500";

export const primary =
  "rounded-xl bg-violet-700 px-4 py-3 font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40";

export const secondary =
  "rounded-xl border border-slate-300 bg-white px-4 py-3 font-medium text-slate-800 disabled:opacity-40";

export function showGameNotification(title: string, body: string) {
  if (
    typeof Notification === "undefined" ||
    Notification.permission !== "granted" ||
    document.hasFocus()
  )
    return;
  try {
    const notification = new Notification(title, { body });
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
  } catch {
    // 알림을 지원하지 않는 환경에서도 게임 진행은 계속한다.
  }
}
