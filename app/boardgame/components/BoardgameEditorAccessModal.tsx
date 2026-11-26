"use client";
import { GameDialog } from "@/components/GameDialog";
import { useEffect, useState, useTransition } from "react";
import { sharedWith, share, revoke, setVisibility } from "../sharing";
import type { BoardgameSummary, ShareKind, ShareReceipt } from "../types/session";

export default function BoardgameEditorAccessModal({ board, onClose, refresh }: {
  board: BoardgameSummary; onClose: () => void; refresh: () => Promise<void>;
}) {
  const [kind,setKind] = useState<ShareKind>("nickname");
  const [rows,setRows] = useState<ShareReceipt[]>([]);
  const [message,setMessage] = useState("");
  const [busy,start] = useTransition();
  async function load() {
    const result = await sharedWith(board.id);
    if (result.success) setRows(result.data); else setMessage(result.message);
  }
  useEffect(() => { let active = true;
    void sharedWith(board.id).then(r => { if(active) { if(r.success) setRows(r.data); else setMessage(r.message); } });
    return () => { active = false; };
  },[board.id]);
  return <GameDialog title="공유 관리" onClose={onClose}>
    <section className="space-y-5 text-sm leading-6 text-[#38bdf8]">
      <label className="flex items-center gap-2 font-semibold"><input type="checkbox" checked={board.is_public} disabled={busy} onChange={e => {
        const checked = e.target.checked;
        start(async()=>{const r=await setVisibility(board.id,checked); if(r.success) await refresh(); else setMessage(r.message);});
      }}/> 전체 공개</label>
      <form className="grid gap-3" action={form => start(async()=>{
        const r = await share(board.id,kind,String(form.get("target")),String(form.get("permission") ?? "editor"));
        if(r.success) {setMessage("요청을 처리했습니다."); await load();} else setMessage(r.message);
      })}>
        <select className="w-full rounded-lg border border-[#334155] bg-[#020617] px-3 py-2.5" aria-label="초대 방식" value={kind} onChange={e=>setKind(e.target.value as ShareKind)}>
          <option value="nickname">닉네임</option><option value="email">이메일</option><option value="real_name">실명</option>
        </select>
        <input className="w-full rounded-lg border border-[#334155] bg-[#0f172a] px-3 py-2.5" required name="target" type={kind==="email"?"email":"text"} placeholder="정확한 값을 입력하세요" aria-label="초대 대상"/>
        {kind==="nickname" && <select className="w-full rounded-lg border border-[#334155] bg-[#020617] px-3 py-2.5" name="permission" aria-label="공유 권한"><option value="viewer">뷰어</option><option value="editor">편집자</option></select>}
        <button className="button" disabled={busy}>권한 부여</button>
      </form>
      <p className="text-[#94a3b8]">이메일과 실명으로 초대하면 편집 권한을 부여합니다. 동명이인은 닉네임이나 이메일로 초대하세요.</p>
      {rows.map(r=><div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#334155] pt-3" key={r.receipt}>{r.nickname ?? new Date(r.created_at).toLocaleString("ko-KR")} · {r.permission==="editor"?"편집자":"뷰어"} <button className="rounded-lg border border-[#334155] px-3 py-1.5" disabled={busy} onClick={()=>start(async()=>{
        const res=await revoke(board.id,r.receipt); if(res.success) await load(); else setMessage(res.message);
      })}>회수</button></div>)}
      <p role="status">{message}</p>
    </section>
  </GameDialog>;
}
