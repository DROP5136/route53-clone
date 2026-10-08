import type { Metadata } from "next";

import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";

export const metadata: Metadata = {
  title: "Hosted zones",
};

const columns = ["Hosted zone name", "Type", "Record count", "Description", "Hosted zone ID"];

export default function HostedZonesPage() {
  return (
    <>
      <Breadcrumbs items={[{ href: "/", label: "Route 53" }, { label: "Hosted zones" }]} />
      <PageHeader
        title="Hosted zones"
        description="A hosted zone is a container for the records that define how traffic is routed for a domain."
        actions={<Button variant="primary">Create hosted zone</Button>}
      />
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Find hosted zones</span>
          <input type="search" placeholder="Find hosted zones" />
        </label>
      </div>
      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column} scope="col">
                  {column}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="empty-cell" colSpan={columns.length}>
                No hosted zones.
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </>
  );
}
