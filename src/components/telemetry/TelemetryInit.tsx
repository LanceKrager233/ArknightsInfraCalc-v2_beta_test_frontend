"use client";

import { useEffect, useRef } from "react";

import { usePathname } from "next/navigation";

import { track } from "@/lib/telemetry";

interface LayoutShiftEntry extends PerformanceEntry {
  hadRecentInput: boolean;
  value: number;
}

/** 全局性能与页面停留埋点：Web Vitals、长任务、页面访问时长。 */
export function TelemetryInit() {
  const pathname = usePathname();
  const pageStartRef = useRef<{ page: string; at: number } | null>(null);
  const clsValueRef = useRef(0);

  // 页面停留：路由进入记一次 page_view，切换/隐藏/卸载时补停留时长。
  useEffect(() => {
    const report = (final: boolean) => {
      const start = pageStartRef.current;
      if (!start) return;
      track({
        type: "interaction",
        name: "page_view",
        page: start.page,
        durationMs: Math.max(0, Date.now() - start.at),
      });
      // CLS 只在上报时刻记一次最终累计值。
      if (clsValueRef.current > 0) {
        track({
          type: "performance",
          name: "web_vitals_cls",
          page: start.page,
          value: Math.round(clsValueRef.current * 1000),
        });
        clsValueRef.current = 0;
      }
      pageStartRef.current = final ? null : { page: pathname, at: Date.now() };
    };
    if (!pageStartRef.current) {
      pageStartRef.current = { page: pathname, at: Date.now() };
    } else {
      report(false);
      pageStartRef.current = { page: pathname, at: Date.now() };
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === "hidden") report(true);
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      report(true);
    };
  }, [pathname]);

  // 整页加载性能（FCP/LCP/TTFB）+ 长任务 + CLS 累计：只挂载一次。
  useEffect(() => {
    const page = window.location.pathname;
    const trackVital = (name: string, durationMs?: number, value?: number) => {
      track({ type: "performance", name, page, durationMs, value });
    };
    try {
      const paint = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name === "first-contentful-paint") {
            trackVital("web_vitals_fcp", Math.round(entry.startTime));
          }
        }
      });
      paint.observe({ type: "paint", buffered: true });
    } catch {
      // 浏览器不支持时跳过。
    }
    try {
      const lcp = new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const last = entries[entries.length - 1];
        if (last) trackVital("web_vitals_lcp", Math.round(last.startTime));
      });
      lcp.observe({ type: "largest-contentful-paint", buffered: true });
    } catch {
      // 浏览器不支持时跳过。
    }
    try {
      const layoutShift = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          const shift = entry as LayoutShiftEntry;
          if (!shift.hadRecentInput) clsValueRef.current += shift.value;
        }
      });
      layoutShift.observe({ type: "layout-shift", buffered: true });
    } catch {
      // 浏览器不支持时跳过。
    }
    try {
      const navigation = performance.getEntriesByType("navigation")[0] as PerformanceNavigationTiming | undefined;
      if (navigation) {
        trackVital("web_vitals_ttfb", Math.round(navigation.responseStart - navigation.requestStart));
      }
    } catch {
      // 浏览器不支持时跳过。
    }
    try {
      const longTasks = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          trackVital("long_task_total", Math.round(entry.duration));
        }
      });
      longTasks.observe({ type: "longtask", buffered: true });
    } catch {
      // 浏览器不支持时跳过。
    }
  }, []);

  return null;
}
