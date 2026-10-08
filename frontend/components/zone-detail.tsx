"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { X } from "lucide-react";

import { useRequireAuth } from "@/components/auth-provider";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Button } from "@/components/button";
import { PageHeader } from "@/components/page-header";
import { api, ApiError, type HostedZone } from "@/lib/api";

function zoneTypeLabel(zoneType: HostedZone["zone_type"]) {
  return zoneType === "private" ? "Private" : "Public";
}

function formatTimestamp(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}

export function ZoneDetail() {
  const auth = useRequireAuth();
  const router = useRouter();
  const params = useParams<{ zoneId: string }>();
  const zoneId = Array.isArray(params.zoneId) ? params.zoneId[0] : params.zoneId;
  const [zone, setZone] = useState<HostedZone | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

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
        const data = await api<HostedZone>(`/zones/${encodeURIComponent(zoneId)}`);
        if (!cancelled) {
          setZone(data);
        }
      } catch (err) {
        if (!cancelled) {
          setZone(null);
          setError(err instanceof ApiError ? err.message : "Unable to load hosted zone");
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
  }, [auth.ready, auth.token, zoneId]);

  if (auth.ready && !auth.token) {
    return null;
  }

  const title = zone?.domain_name ?? "Hosted zone";

  return (
    <>
      <Breadcrumbs
        items={[
          { href: "/", label: "Route 53" },
          { href: "/hosted-zones", label: "Hosted zones" },
          { label: title },
        ]}
      />
      <PageHeader
        title={title}
        description="Hosted zone details."
        actions={
          <Button onClick={() => setConfirmOpen(true)} disabled={!zone || loading}>
            Delete hosted zone
          </Button>
        }
      />
      {loading ? <p className="status-line">Loading hosted zone.</p> : null}
      {error ? (
        <div className="notice notice-error" role="alert">
          <span>{error}</span>
          <Link href="/hosted-zones">Back to hosted zones</Link>
        </div>
      ) : null}
      {zone ? (
        <dl className="detail-list">
          <div className="detail-row">
            <dt>Domain name</dt>
            <dd>{zone.domain_name}</dd>
          </div>
          <div className="detail-row">
            <dt>Zone type</dt>
            <dd>{zoneTypeLabel(zone.zone_type)}</dd>
          </div>
          <div className="detail-row">
            <dt>Description</dt>
            <dd>{zone.description || "—"}</dd>
          </div>
          <div className="detail-row">
            <dt>Hosted zone ID</dt>
            <dd>{zone.id}</dd>
          </div>
          <div className="detail-row">
            <dt>Created</dt>
            <dd>{formatTimestamp(zone.created_at)}</dd>
          </div>
          <div className="detail-row">
            <dt>Updated</dt>
            <dd>{formatTimestamp(zone.updated_at)}</dd>
          </div>
        </dl>
      ) : null}
      {confirmOpen && zone ? (
        <DeleteHostedZoneDialog
          zone={zone}
          onClose={() => setConfirmOpen(false)}
          onDeleted={() => {
            router.push(`/hosted-zones?deleted=${encodeURIComponent(zone.domain_name)}`);
          }}
        />
      ) : null}
    </>
  );
}

function DeleteHostedZoneDialog({
  zone,
  onClose,
  onDeleted,
}: {
  zone: HostedZone;
  onClose: () => void;
  onDeleted: () => void;
}) {
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

  async function onDelete() {
    setError(null);
    setPending(true);
    try {
      await api<void>(`/zones/${zone.id}`, { method: "DELETE" });
      onDeleted();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to delete hosted zone");
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop">
      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="delete-zone-title">
        <header className="modal-header">
          <h2 id="delete-zone-title">Delete hosted zone</h2>
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
          <p className="dialog-copy">
            Delete <strong>{zone.domain_name}</strong>? Deleting a hosted zone also removes its DNS records. This cannot
            be undone.
          </p>
        </div>
        <footer className="modal-footer">
          <Button type="button" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button variant="primary" type="button" onClick={onDelete} disabled={pending}>
            {pending ? "Deleting" : "Delete hosted zone"}
          </Button>
        </footer>
      </div>
    </div>
  );
}
