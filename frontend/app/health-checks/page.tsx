import type { Metadata } from "next";

import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = {
  title: "Health checks",
};

export default function HealthChecksPage() {
  return <ComingSoon title="Health checks" />;
}
