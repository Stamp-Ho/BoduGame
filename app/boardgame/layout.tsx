import type { ReactNode } from "react";

export default function BoardgameLayout({ children }: { children: ReactNode }) {
  return <div data-theme="boardgame" className="flex flex-1 flex-col">{children}</div>;
}
