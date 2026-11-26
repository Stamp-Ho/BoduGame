import type { ReactNode } from "react";

export default function AvalonLayout({ children }: { children: ReactNode }) {
  return <div data-theme="avalon" className="flex flex-1 flex-col">{children}</div>;
}
