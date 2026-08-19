"use client";

import dynamic from "next/dynamic";

const WorkbenchApp = dynamic(() => import("@/App"));

export default function AppLoader() {
  return <WorkbenchApp />;
}
