import { useId, useLayoutEffect, useRef } from "react";
import {
  ShieldAlert,
  ShieldOff,
  ShieldQuestionMark,
  Sword,
} from "lucide-react";

export function PlayerAvatar({ name }: { name: string }) {
  return (
    <span
      aria-hidden="true"
      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-violet-100 text-xs font-bold text-violet-700"
    >
      {name.trim().charAt(0) || "?"}
    </span>
  );
}

export function PlayerNote({
  name,
  value,
  disabled,
  onChange,
}: {
  name: string;
  value: string;
  disabled: boolean;
  onChange: (name: string, value: string) => void;
}) {
  const inputRef = useRef<HTMLTextAreaElement>(null);
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (input) input.scrollTop = input.scrollHeight;
  }, [value]);

  return (
    <textarea
      ref={inputRef}
      aria-label={`${name} 개인 메모`}
      value={limitNoteLineBreaks(value)}
      onChange={(event) =>
        onChange(name, limitNoteLineBreaks(event.currentTarget.value))
      }
      disabled={disabled}
      rows={2}
      placeholder="메모: 나만 보임"
      className="h-8.5 w-full resize-none overflow-hidden rounded-lg border border-slate-200 bg-white p-2 pb-0 text-xs text-slate-900 outline-none focus:border-violet-500"
    />
  );
}

function limitNoteLineBreaks(value: string) {
  const lines = value.replace(/\r\n?/g, "\n").split("\n");
  const first = Array.from(lines[0]);
  const overflow = first.slice(10);
  const second = Array.from(overflow.join("") + lines.slice(1).join(""))
    .slice(0, 10)
    .join("");
  return (
    first.slice(0, 10).join("") +
    (lines.length > 1 || overflow.length > 0 ? `\n${second}` : "")
  );
}

export function GoldSword({ className = "size-4" }: { className?: string }) {
  const gradientId = useId().replaceAll(":", "");
  return (
    <Sword
      aria-label="엑스칼리버 보유자"
      className={className}
      stroke={`url(#${gradientId})`}
      strokeWidth={2.5}
    >
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#fff8c5" />
          <stop offset="28%" stopColor="#e6aa20" />
          <stop offset="55%" stopColor="#fff1a0" />
          <stop offset="80%" stopColor="#b87908" />
          <stop offset="100%" stopColor="#ffe66d" />
        </linearGradient>
      </defs>
    </Sword>
  );
}

export function ExcaliburSword() {
  return (
    <span className="pointer-events-none absolute left-4.25 top-2 z-10 -rotate-10 drop-shadow-[0_1px_1px_rgba(120,65,0,0.75)]">
      <GoldSword className="size-8" />
    </span>
  );
}

export function RejectionTrack({
  rejected,
  active,
}: {
  rejected: number;
  active: boolean;
}) {
  return (
    <div
      role="img"
      aria-label={`팀 투표 부결 ${rejected}/5회. 5회 부결되면 악 진영 승리`}
      className="flex items-center gap-1.5 pt-4.5"
    >
      <span
        aria-hidden="true"
        className="mr-1 text-sm font-medium text-slate-600"
      >
        부결
      </span>
      {Array.from({ length: 5 }, (_, index) => {
        const isFinal = index === 4;
        const isRejected = index < rejected;
        const isCurrent = active && index === rejected;
        const Icon = isRejected
          ? ShieldOff
          : isFinal
            ? ShieldAlert
            : ShieldQuestionMark;
        const color = isRejected
          ? "text-slate-950"
          : isCurrent
            ? isFinal
              ? "text-red-600"
              : "text-orange-500"
            : isFinal
              ? "text-red-600/30"
              : "text-slate-400";
        return (
          <Icon
            key={index}
            aria-hidden="true"
            className={`${isFinal ? "size-6" : "size-5"} ${color} ${isCurrent ? "rejection-warning-pulse" : ""}`}
          />
        );
      })}
    </div>
  );
}
