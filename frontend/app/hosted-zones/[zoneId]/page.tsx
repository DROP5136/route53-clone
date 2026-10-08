import type { Metadata } from "next";

import { ZoneDetail } from "@/components/zone-detail";

export const metadata: Metadata = {
  title: "Hosted zone",
};

export default function HostedZonePage() {
  return <ZoneDetail />;
}
