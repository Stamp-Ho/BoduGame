"use client";

import { useActionState, useId, useRef, useState } from "react";
import { login } from "@/app/auth/actions";

export function LoginButton() {
  const dialog = useRef<HTMLDialogElement>(null);
  const title = useId();
  const [next, setNext] = useState("/");
  const [error, submit, pending] = useActionState(login, "");

  function open() {
    setNext(window.location.pathname + window.location.search + window.location.hash);
    dialog.current?.showModal();
  }

  return <>
    <button className="button" onClick={open}>로그인</button>
    <dialog ref={dialog} aria-labelledby={title}>
      <div className="dialog-title">
        <h2 id={title}>로그인</h2>
        <button aria-label="로그인 창 닫기" onClick={() => dialog.current?.close()}>닫기</button>
      </div>
      <form action={submit} className="providers">
        <input type="hidden" name="next" value={next} />
        <button className="button kakao" name="provider" value="kakao" disabled={pending}>카카오로 로그인</button>
        <button className="button google" name="provider" value="google" disabled={pending}>Google로 로그인</button>
        {error && <p role="alert">{error}</p>}
      </form>
    </dialog>
  </>;
}
