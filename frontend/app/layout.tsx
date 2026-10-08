import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Route 53",
  description: "Route 53",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
