import type { Metadata } from "next";
import { Barlow_Condensed, Noto_Sans_SC } from "next/font/google";
import localFont from "next/font/local";
import "overlayscrollbars/overlayscrollbars.css";

import { AppMotionProvider } from "@/components/MotionProvider";
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

const numberFont = localFont({
  src: "./fonts/Bender-Bold.otf",
  variable: "--font-number-source",
  weight: "400",
  style: "normal",
  display: "swap",
  preload: true,
  adjustFontFallback: false,
  declarations: [
    { prop: "unicode-range", value: "U+0025, U+002B, U+002C-003A, U+2212" },
  ],
});

export const metadata: Metadata = {
  title: "可露希尔基建终端",
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
      className={`${uiFont.variable} ${technicalFont.variable} ${numberFont.variable} antialiased`}
      suppressHydrationWarning
    >
      <body>
        <AppMotionProvider>
          <PageScrollbar />
          <TooltipProvider>{children}</TooltipProvider>
        </AppMotionProvider>
      </body>
    </html>
  );
}

