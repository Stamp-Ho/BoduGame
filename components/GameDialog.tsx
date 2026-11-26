"use client";
import { useEffect,useId,useRef,type ReactNode } from "react";
export function GameDialog({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}) {
  const dialog=useRef<HTMLDialogElement>(null);
  const label=useId();
  useEffect(()=>{const el=dialog.current;el?.showModal();return ()=>el?.close();},[]);
  return <dialog ref={dialog} aria-labelledby={label} onCancel={onClose} className="space-y-4">
    <div className="dialog-title"><h2 id={label} className="text-black">{title}</h2><button type="button" onClick={onClose}>닫기</button></div>
    {children}
  </dialog>;
}
