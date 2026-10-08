"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { X } from "lucide-react";

import { useRequireAuth } from "@/components/auth-provider";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { api, ApiError, type HostedZone } from "@/lib/api";

const columns = ["Hosted zone name", "Type", "Record count", "Description", "Hosted zone ID"];

function zoneTypeLabel(zoneType: HostedZone["zone_type"]) {
  return zoneType === "private" ? "Private" : "Public";
}

export function HostedZonesView() {
  const auth = useRequireAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const deletedName = searchParams.get("deleted");
  const [zones, setZones] = useState<HostedZone[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createdNotice, setCreatedNotice] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const notice = createdNotice ?? (deletedName ? `Deleted hosted zone ${deletedName}.` : null);

  const loadZones = useCallback(async (options?: { quiet?: boolean }) => {
    if (!options?.quiet) {
      setLoading(true);
    }
    setError(null);
    try {
      const data = await api<HostedZone[]>("/zones");
      setZones(data);
    } catch (err) {
      if (!options?.quiet) {
        setZones([]);
      }
      setError(err instanceof ApiError ? err.message : "Unable to load hosted zones");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!auth.ready || !auth.token) {
      return;
    }
    let cancelled = false;
    (async () => {
      await Promise.resolve();
      if (cancelled) {
        return;
      }
      setLoading(true);
      setError(null);
      try {
        const data = await api<HostedZone[]>("/zones");
        if (!cancelled) {
          setZones(data);
        }
      } catch (err) {
        if (!cancelled) {
          setZones([]);
          setError(err instanceof ApiError ? err.message : "Unable to load hosted zones");
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [auth.ready, auth.token]);

  const visibleZones = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return zones;
    }
    return zones.filter((zone) => {
      const description = zone.description ?? "";
      return (
        zone.domain_name.toLowerCase().includes(query) ||
        description.toLowerCase().includes(query) ||
        String(zone.id).includes(query)
      );
    });
  }, [search, zones]);

  if (auth.ready && !auth.token) {
    return null;
  }

  let bodyMessage: string | null = null;
  if ((!auth.ready || loading) && zones.length === 0) {
    bodyMessage = "Loading hosted zones.";
  } else if (error && zones.length === 0) {
    bodyMessage = error;
  } else if (visibleZones.length === 0) {
    bodyMessage = zones.length === 0 ? "No hosted zones." : "No hosted zones match your search.";
  }

  return (
    <>
      <Breadcrumbs items={[{ href: "/", label: "Route 53" }, { label: "Hosted zones" }]} />
      <PageHeader
        title="Hosted zones"
        description="A hosted zone is a container for the records that define how traffic is routed for a domain."
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)} disabled={!auth.token}>
            Create hosted zone
          </Button>
        }
      />
      {notice ? (
        <div className="notice notice-success" role="status">
          <span>{notice}</span>
          <button
            className="text-button"
            type="button"
            onClick={() => {
              setCreatedNotice(null);
              if (deletedName) {
                router.replace("/hosted-zones");
              }
            }}
          >
            Dismiss
          </button>
        </div>
      ) : null}
      {error && zones.length > 0 ? (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
        </div>
      ) : null}
      <div className="toolbar">
        <label className="search">
          <span className="sr-only">Find hosted zones</span>
          <input
            type="search"
            placeholder="Find hosted zones"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
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
            {bodyMessage ? (
              <tr>
                <td
                  className={error ? "empty-cell error-cell" : "empty-cell"}
                  colSpan={columns.length}
                  role={bodyMessage === error ? "alert" : undefined}
                >
                  {bodyMessage}
                </td>
              </tr>
            ) : (
              visibleZones.map((zone) => (
                <tr key={zone.id}>
                  <td>
                    <Link className="zone-link" href={`/hosted-zones/${zone.id}`}>
                      {zone.domain_name}
                    </Link>
                  </td>
                  <td>{zoneTypeLabel(zone.zone_type)}</td>
                  <td title="Record count is not available">—</td>
                  <td>{zone.description || "—"}</td>
                  <td>{zone.id}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {createOpen ? (
        <CreateHostedZoneDialog
          onClose={() => setCreateOpen(false)}
          onCreated={async () => {
            setCreateOpen(false);
            setSearch("");
            setCreatedNotice("Hosted zone created.");
            await loadZones({ quiet: true });
          }}
        />
      ) : null}
    </>
  );
}

function CreateHostedZoneDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [domainName, setDomainName] = useState("");
  const [zoneType, setZoneType] = useState<"public" | "private">("public");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && !pending) {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, pending]);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setPending(true);
    try {
      await api<HostedZone>("/zones", {
        method: "POST",
        body: JSON.stringify({
          domain_name: domainName,
          zone_type: zoneType,
          description: description.trim() || null,
        }),
      });
      await onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to create hosted zone");
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <form
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-zone-title"
        onSubmit={onSubmit}
      >
        <header className="modal-header">
          <h2 id="create-zone-title">Create hosted zone</h2>
          <button className="plain-icon" type="button" aria-label="Close" onClick={onClose} disabled={pending}>
            <X size={16} strokeWidth={2} aria-hidden="true" />
          </button>
        </header>
        <div className="modal-body">
          {error ? (
            <p className="form-error" role="alert">
              {error}
            </p>
          ) : null}
          <label className="field">
            <span>Domain name</span>
            <input
              name="domain_name"
              value={domainName}
              onChange={(event) => setDomainName(event.target.value)}
              autoFocus
              required
            />
          </label>
          <label className="field">
            <span>Zone type</span>
            <select name="zone_type" value={zoneType} onChange={(event) => setZoneType(event.target.value as "public" | "private")}>
              <option value="public">Public</option>
              <option value="private">Private</option>
            </select>
          </label>
          <label className="field">
            <span>Description</span>
            <textarea name="description" value={description} onChange={(event) => setDescription(event.target.value)} />
          </label>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="submit" disabled={pending}>
            {pending ? "Creating" : "Create hosted zone"}
          </Button>
        </footer>
      </form>
    </div>
  );
}
