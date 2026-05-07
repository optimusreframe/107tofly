import type { ReactNode } from "react";
import { PageShell } from "@/components/PageShell";

export function PublicLayout({ children }: { children: ReactNode }) {
  return <PageShell>{children}</PageShell>;
}
