import type { Metadata } from "next";
import "overlayscrollbars/overlayscrollbars.css";

import { PageScrollbar } from "@/components/ui/page-scrollbar";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

export const metadata: Metadata = {
  title: "明日方舟基建排班助手",
  description: "导入干员数据，生成三班排班并导出到 MAA。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="antialiased" suppressHydrationWarning>
      <body>
        <PageScrollbar />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

