import { ROLES, type Config } from "./rules";

export function RoleComposition({
  config,
  embedded = false,
}: {
  config: Config;
  embedded?: boolean;
}) {
  const groups = [
    { side: "good", label: "선", slots: config.goodSlots, ordinary: "충신" },
    { side: "evil", label: "악", slots: config.evilSlots, ordinary: "하수인" },
  ] as const;
  const enabledRules = [
    ...(config.expansion ? ["확장 직업 사용"] : []),
    ...(config.lady ? ["호수의 여인"] : []),
    ...(config.lancelot === "variant1"
      ? ["랜슬롯 변형 1 · 현재 악은 성공/실패 선택"]
      : []),
    ...(config.lancelot === "variant2"
      ? ["랜슬롯 변형 2 · 현재 악은 실패만 제출"]
      : []),
    ...(config.targeting ? ["목표 원정 선택"] : []),
    ...(config.trapper ? ["함정꾼"] : []),
    ...(config.excalibur ? ["엑스칼리버"] : []),
    ...(config.plot ? ["플롯 카드"] : []),
    ...(config.seniorKnowsJunior ? ["상급 전령의 정보"] : []),
  ];

  return (
    <section
      className={embedded ? "" : "rounded-2xl bg-white p-4 shadow-sm sm:p-6"}
    >
      {!embedded && (
        <>
          <h2 className="font-bold">저장된 직업 구성</h2>
          <p className="mt-1 text-sm text-slate-500">
            게임 시작 시 아래 직업이 참가자에게 무작위로 배정됩니다.
          </p>
        </>
      )}
      <div className="mt-4 grid grid-cols-2 gap-3 sm:gap-4">
        {groups.map(({ side, label, slots, ordinary }) => (
          <div key={side} className="min-w-0">
            <h3
              className={`rounded-lg text-sm font-bold ${side === "good" ? "text-blue-900" : "text-red-900"}`}
            >
              {label} 진영 · {slots.length}명
            </h3>
            <ul className="mt-2 space-y-2">
              {slots.map((slot, index) => (
                <li
                  key={index}
                  className={`min-w-0 rounded-lg border px-3 py-2 text-sm font-medium break-keep ${side === "good" ? "border-blue-100 bg-blue-50 text-blue-900" : "border-red-100 bg-red-50 text-red-900"}`}
                >
                  {slot.length
                    ? slot.map((role) => ROLES[role].name).join(" + ")
                    : ordinary}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      {enabledRules.length > 0 && (
        <div className="mt-5 border-t border-slate-300 pt-4">
          <h3 className="text-sm font-bold">적용 규칙</h3>
          <ul className="mt-2 flex flex-wrap gap-2">
            {enabledRules.map((rule) => (
              <li
                key={rule}
                className="rounded-lg bg-violet-50 px-3 py-2 text-sm font-medium text-violet-900"
              >
                {rule}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
