import type { Metadata } from "next";
import { Barlow_Condensed, Noto_Sans_SC } from "next/font/google";
import "overlayscrollbars/overlayscrollbars.css";

import { PageScrollbar } from "@/components/ui/page-scrollbar";
import { TooltipProvider } from "@/components/ui/tooltip";

import "./globals.css";

const uiFont = Noto_Sans_SC({
  variable: "--font-ui-source",
  subsets: ["latin"],
  weight: "variable",
  display: "swap",
  fallback: ["Microsoft YaHei", "PingFang SC", "sans-serif"],
});

const technicalFont = Barlow_Condensed({
  variable: "--font-technical-source",
  subsets: ["latin"],
  weight: ["500", "600"],
  display: "swap",
  fallback: ["Arial Narrow", "sans-serif"],
});

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
    <html
      lang="zh-CN"
      className={`${uiFont.variable} ${technicalFont.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <PageScrollbar />
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}

