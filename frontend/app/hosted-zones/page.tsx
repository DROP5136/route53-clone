import { Suspense } from "react";
import type { Metadata } from "next";

import { HostedZonesView } from "@/components/hosted-zones-view";

export const metadata: Metadata = {
  title: "Hosted zones",
};

export default function HostedZonesPage() {
  return (
    <Suspense fallback={<p className="status-line">Loading hosted zones.</p>}>
      <HostedZonesView />
    </Suspense>
  );
}
