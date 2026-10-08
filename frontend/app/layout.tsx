import type { Metadata } from "next";

import { SideNav } from "@/components/side-nav";
import { TopNav } from "@/components/top-nav";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Route 53",
    template: "%s | Route 53",
  },
  description: "Route 53",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>
        <div className="console">
          <TopNav />
          <div className="console-body">
            <SideNav />
            <main className="console-main">{children}</main>
          </div>
        </div>
      </body>
    </html>
  );
}
