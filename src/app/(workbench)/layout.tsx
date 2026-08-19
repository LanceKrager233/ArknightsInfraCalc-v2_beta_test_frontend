import WorkbenchApp from "@/App";

export default function WorkbenchLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <WorkbenchApp>{children}</WorkbenchApp>;
}
