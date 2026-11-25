import Link from "next/link";

export default function LoginErrorPage() {
  return <main className="shell">
    <h1>로그인을 완료하지 못했습니다</h1>
    <p className="lead">상단의 로그인 버튼에서 다시 시도해 주세요.</p>
    <Link href="/">게임 목록으로</Link>
  </main>;
}
