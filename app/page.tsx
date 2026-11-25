import { GameCard } from "@/components/GameCard";

export default function Home() {
  return <main className="shell">
    <h1>게임 목록</h1>
    <div className="games">
      <GameCard href="/avalon" name="아발론" theme="avalon" description="숨겨진 진영과 원정대의 선택" />
      <GameCard href="/boardgame" name="주루마블" theme="marble" description="주사위와 이벤트로 만드는 보드 한 판" />
    </div>
  </main>;
}
