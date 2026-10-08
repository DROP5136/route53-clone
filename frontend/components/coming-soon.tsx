import { Breadcrumbs } from "@/components/breadcrumbs";
import { PageHeader } from "@/components/page-header";

export function ComingSoon({ title }: { title: string }) {
  return (
    <>
      <Breadcrumbs items={[{ href: "/", label: "Route 53" }, { label: title }]} />
      <PageHeader title={title} />
      <section className="panel">
        <h2>Coming soon</h2>
        <p>This section is not available yet.</p>
      </section>
    </>
  );
}
