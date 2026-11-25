import { GOOD_COUNTS, TEAM_COUNTS } from "./expeditions";

export function ExpeditionTable() {
  return (
    <div className="table-scroll">
      <table aria-label="참가 인원별 진영과 원정대 인원">
        <thead>
          <tr>
            {["참가자", "선", "악", "1차", "2차", "3차", "4차", "5차"].map(
              (label) => (
                <th key={label} scope="col">
                  {label}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {Object.entries(TEAM_COUNTS).map(([count, teams]) => {
            const good = GOOD_COUNTS[Number(count)];
            return (
              <tr key={count}>
                <th scope="row">{count}명</th>
                <td>{good}</td>
                <td>{Number(count) - good}</td>
                {teams.map((size, round) => (
                  <td key={round}>{size}</td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
