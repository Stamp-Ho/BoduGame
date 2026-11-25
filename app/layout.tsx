import type { Metadata } from "next";
import { SiteHeader } from "@/components/SiteHeader";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "보두게임", template: "%s · 보두게임" },
  description: "아발론과 주루마블을 함께 즐기는 보드게임 공간",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return <html lang="ko"><body><SiteHeader />{children}</body></html>;
}
