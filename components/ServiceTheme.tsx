"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

export function ServiceTheme({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const theme = pathname === "/" || pathname === "/avalon" || pathname.startsWith("/avalon/")
    ? "avalon"
    : pathname === "/boardgame" || pathname.startsWith("/boardgame/") ? "boardgame" : "default";
  return <div data-service-theme={theme} className="service-theme flex min-h-dvh flex-1 flex-col">{children}</div>;
}
