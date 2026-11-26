import {
  defaultConfig,
  GOOD_COUNTS,
  ROLES,
  type Config,
  type Role,
} from "./rules";
import { field, primary } from "./room-ui";

export function ConfigEditor({
  config,
  setConfig,
  save,
  busy,
}: {
  config: Config;
  setConfig: (c: Config) => void;
  save: () => void;
  busy: boolean;
}) {
  const setCount = (count: number) =>
    setConfig({
      ...defaultConfig(count),
      expansion: config.expansion || count === 10,
    });
  const setExpansion = (enabled: boolean) => {
    if (enabled) {
      setConfig({ ...config, expansion: true });
      return;
    }
    setConfig({
      ...config,
      expansion: false,
      goodSlots: config.goodSlots.map((slot) => {
        const base = slot.filter((r) => !ROLES[r].expansion);
        return base.length ? base : [];
      }),
      evilSlots: config.evilSlots.map((slot) =>
        slot.filter((r) => !ROLES[r].expansion),
      ),
      trapper: false,
      excalibur: false,
      plot: false,
      seniorKnowsJunior: false,
    });
  };
  const toggleRole = (side: "good" | "evil", index: number, role: Role) => {
    const slots = (side === "good" ? config.goodSlots : config.evilSlots).map(
      (s) => [...s],
    );
    slots[index] = slots[index].includes(role)
      ? slots[index].filter((r) => r !== role)
      : [...slots[index], role];
    setConfig({
      ...config,
      [side === "good" ? "goodSlots" : "evilSlots"]: slots,
      ...((role === "good_lancelot" || role === "evil_lancelot") && slots[index].includes(role)
        ? { lancelot: "variant2" as const }
        : {}),
    });
  };
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm sm:p-6">
      <h2 className="text-lg font-bold">방 설정</h2>
      <p className="mt-1 text-sm text-slate-500">
        직업은 자리별로 배치한 뒤 참가자에게 무작위로 배정됩니다. 멀린만 다른
        직업을 겸할 수 없습니다.
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">
          인원{" "}
          <select
            className={field}
            value={config.playerCount}
            onChange={(e) => setCount(Number(e.target.value))}
          >
            {[5, 6, 7, 8, 9, 10].map((n) => (
              <option key={n} value={n}>
                {n}명
              </option>
            ))}
          </select>
        </label>
        <label className="flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-amber-900">
          <input
            type="checkbox"
            checked={config.expansion}
            onChange={(e) => setExpansion(e.target.checked)}
          />{" "}
          확장
        </label>
      </div>
      {(["good", "evil"] as const).map((side) => (
        <div key={side} className="mt-5">
          <h3 className="font-bold">
            {side === "good" ? "선" : "악"} 진영{" "}
            {side === "good"
              ? GOOD_COUNTS[config.playerCount]
              : config.playerCount - GOOD_COUNTS[config.playerCount]}
            자리
          </h3>
          <div className="mt-2 space-y-3">
            {(side === "good" ? config.goodSlots : config.evilSlots).map(
              (slot, i) => {
                return (
                  <div
                    key={i}
                    className="rounded-xl border border-slate-300 p-3"
                  >
                    <p
                      className={
                        side === "good" && i === 0
                          ? "text-sm font-semibold"
                          : "mb-2 text-sm font-semibold"
                      }
                    >
                      {i + 1}번 자리 ·{" "}
                      {slot.length > 0
                        ? slot.map((r) => ROLES[r].name).join(" + ")
                        : side === "good"
                          ? "충신"
                          : "하수인"}
                    </p>
                    {!(side === "good" && i === 0) && (
                      <div className="flex flex-wrap gap-1.5">
                        {(Object.keys(ROLES) as Role[])
                          .filter(
                            (role) =>
                              role !== "merlin" &&
                              role !== "assassin" &&
                              !(side === "good" && i === 0) &&
                              ROLES[role].side === side &&
                              (config.expansion || !ROLES[role].expansion),
                          )
                          .map((role) => (
                            <button
                              key={role}
                              type="button"
                              onClick={() => toggleRole(side, i, role)}
                              className={`rounded-lg border px-2.5 py-1.5 text-xs font-medium ${slot.includes(role) ? "border-violet-600 bg-violet-100 text-violet-900" : "border-slate-300 text-slate-500"}`}
                            >
                              {ROLES[role].name}
                            </button>
                          ))}
                      </div>
                    )}
                  </div>
                );
              },
            )}
          </div>
        </div>
      ))}
      <div className="mt-5 grid gap-2 grid-cols-2">
        {(
          [
            ["lady", "호수의 여인"],
            ["targeting", "목표 원정 선택"],
            ["trapper", "함정꾼"],
            ["excalibur", "엑스칼리버"],
            ["plot", "플롯 카드"],
            ["seniorKnowsJunior", "상급 전령의 정보"],
          ] as const
        )
          .filter(
            ([key]) =>
              config.expansion ||
              !["trapper", "excalibur", "plot", "seniorKnowsJunior"].includes(
                key,
              ),
          )
          .map(([key, label]) => (
            <label
              key={key}
              className="flex items-center gap-2 rounded-xl bg-slate-100 p-3 text-sm"
            >
              <input
                type="checkbox"
                checked={config[key]}
                onChange={(e) =>
                  setConfig({ ...config, [key]: e.target.checked })
                }
              />{" "}
              {label}
            </label>
          ))}
      </div>
      <label className="mt-4 block text-sm font-medium">
        랜슬롯 원정 카드 규칙{" "}
        <select
          className={`${field} mt-1 block w-full`}
          value={config.lancelot}
          onChange={(e) =>
            setConfig({
              ...config,
              lancelot: e.target.value as Config["lancelot"],
            })
          }
        >
          <option value="off">사용 안 함</option>
          <option value="variant1">변형 1: 현재 악은 성공/실패 선택</option>
          <option value="variant2">변형 2: 현재 악은 실패만 제출</option>
        </select>
      </label>
      {config.lancelot !== "off" && (
        <p className="mt-2 text-xs text-slate-500">
          두 변형 모두 2·3·4차 원정 뒤, 호수의 여인 확인 후 충성심 카드를
          뽑습니다. 7장 중 전환 2장입니다.
        </p>
      )}
      <button
        className={`${primary} mt-5 w-full`}
        disabled={busy}
        onClick={save}
      >
        설정 저장
      </button>
    </section>
  );
}
