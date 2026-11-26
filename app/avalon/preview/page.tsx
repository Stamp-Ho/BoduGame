import { Suspense } from "react";
import { connection } from "next/server";
import Link from "next/link";
import AvalonMain from "../AvalonMain";
import { getPreview, previewPhases } from "../preview";

async function Preview({ searchParams }: { searchParams: Promise<{screen?: string}> }) {
 await connection();
 const {screen = "propose"} = await searchParams;
 const data = getPreview(screen);
 return <>
   <section className="shell space-y-3 py-4">
     <div className="flex items-center justify-between"><h2 className="text-2xl font-bold">아발론 미리보기</h2><Link href="/avalon">방 목록으로</Link></div>
     <p className="text-sm">예시 참가자로 게임 단계별 화면을 확인합니다.</p>
     <div className="flex flex-wrap gap-2">{previewPhases.map(item=><Link key={item.screen}
       href={`/avalon/preview?screen=${item.screen}`} aria-current={screen===item.screen?"page":undefined}
       className="rounded-full border px-3 py-1.5 text-sm aria-[current=page]:bg-violet-100">{item.label}</Link>)}</div>
   </section>
   <AvalonMain key={screen} user={data.user} preview={data.view}/>
 </>;
}
export default function Page({searchParams}:{searchParams:Promise<{screen?:string}>}) {
 return <Suspense fallback={<p>미리보기를 불러오는 중…</p>}><Preview searchParams={searchParams}/></Suspense>;
}
