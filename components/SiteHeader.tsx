import Link from "next/link";
import { Suspense } from "react";
import { AccountMenu } from "./auth/AccountMenu";

export function SiteHeader() {
  return <header>
    <div className="shell header-row">
      <Link href="/" className="brand">보두게임</Link>
      <nav aria-label="게임"><Link href="/avalon">아발론</Link><Link href="/boardgame">주루마블</Link></nav>
      <Suspense fallback={<span aria-label="로그인 상태 확인 중">…</span>}><AccountMenu /></Suspense>
    </div>
  </header>;
}
