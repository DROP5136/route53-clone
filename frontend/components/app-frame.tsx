"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";

export function AppFrame({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  if (pathname === "/login" || pathname === "/register") {
    return children;
  }

  return (
    <div className="console">
      <TopNav />
      <div className="console-body">
        <SideNav />
        <main className="console-main">{children}</main>
      </div>
    </div>
  );
}
